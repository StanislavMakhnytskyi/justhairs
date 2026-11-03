# Development guide

Everything a developer needs that the [README](../README.md) leaves out: scripts, project layout, testing, the booking engine and known issues. The database access model and migrations are in [supabase.md](supabase.md); the design system is in [design.md](design.md).

Requires Node.js 22.18 or newer (`engines` in `package.json`).

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js dev server / production build / serve the build |
| `npm run check` | `lint` + `typecheck` (run before every commit) |
| `npm run lint` / `typecheck` | ESLint (zero warnings, includes the React Compiler rules) / `tsc --noEmit` |
| `npm run test:unit` | Node's test runner over `tests/unit/*.test.mjs` (webhook, calendar file, opening-hours label, salon time) |
| `npm run test:db` | Every migration and the seed on an in-memory Postgres (PGlite): grants/RLS, functions, indexes, booking behaviour, payments, upgrade path and `database.types.ts`. No live project needed |
| `npm run db:setup` | Regenerate `supabase/setup.sql` from the migrations and seed; `db:setup:check` verifies it is current (CI runs it) |
| `npm run test:smoke` | Read-only Playwright smoke tests against `TEST_PROD_URL` (or `PLAYWRIGHT_BASE_URL`) |
| `npm run test:e2e` | Full booking flows including a Stripe test-mode payment. **Writes to the live database**, see below |
| `npm run test:smoke:preview`, `test:e2e:preview` | The same, against `TEST_PREVIEW_URL` |
| `npm run playwright:install` | Install Chromium for Playwright |
| `npm run shots -- --base <url>` | Screenshot matrix into `.shots/` (read-only; gitignored) |
| `npm run check:flow -- --base <url>` | Read-only walk of the booking flow that reports runtime errors; never confirms a booking |
| `npm run types:gen` | Regenerate `src/lib/supabase/database.types.ts` with the Supabase CLI (needs `supabase login`) |
| `node --env-file=.env.local scripts/seed-demo.mjs` | Demo visits, reviews and reservations (tagged `*@justhairs.test`, idempotent) |
| `node --env-file=.env.local scripts/sync-catalog.mjs` | Push catalog changes to a live database |
| `node --env-file=.env.local scripts/gen-blur.mjs` | Regenerate `src/lib/blur.generated.ts` (commit the result) |

The Supabase project used by the demo is shared and live. Do not run `test:e2e`, `seed-demo`, `sync-catalog` or apply a migration without checking with its owner.

`database.types.ts` has the shape `supabase gen types typescript` produces and is kept in sync with the schema by `tests/db/types.test.mjs`; `types:gen` replaces it with the real output.

## Project layout

```
src/
  app/
    (home)/page.tsx              Home (ISR)
    services/                    List + detail (static / ISR); ?staff= filters by specialist
    masters/                     Team (static / ISR)
    book/                        4-step flow (BookingFlow.tsx)
    (secure)/book/pay/[id]/      Guest details + Stripe Checkout / pay at the salon
    (secure)/book/confirmation/[id]/   Reference code, status, .ics download
    api/stripe/webhook/          Signature-verified Stripe events
    api/health/                  Environment / connectivity health check
    privacy/ terms/              Legal pages
    sitemap.ts robots.ts manifest.ts opengraph-image.tsx
  components/
    ui/                          Design-system components
    home/ marketing/ layout/ theme/   Home sections, hero/footer/map, app shell, theme toggle
  lib/
    supabase/                    public + service-role clients, database and domain types
    actions/booking.ts           Zod-validated server actions (book, pay, checkout, abandon)
    slot-cache.ts                useSyncExternalStore availability cache
    queries.ts, appointments.ts  Catalog reads; appointment read + Stripe reconcile
    stripe.ts                    Stripe client (null without a key)
supabase/
  migrations/                    Ordered history, 0001-0009
  setup.sql                      Generated one-shot bundle: all migrations + seed (fresh install)
  seed.sql                       Demo salon, services, staff, hours
scripts/                         seed-demo, sync-catalog, gen-blur, build-setup-sql, shots, flow-check, ...
tests/                           unit/, db/, smoke/, e2e/, support/
docs/                            design.md, supabase.md, development.md
CODE_REVIEW.md                   Self-review: tracked findings with status
```

## Booking engine

`get_available_slots(service_id, staff_id, day)`, `get_day_availability(...)` and `book_appointment(...)` are `SECURITY DEFINER` Postgres functions callable only by the service role; the Next.js server actions call them with the server client. Slots come from each specialist's `staff_working_hours` for the weekday, minus `staff_time_off` and existing appointments, stepped by `app_settings.slot_step_min`. "Any specialist" collapses to distinct times and a concrete specialist is assigned at booking.

`book_appointment` re-checks availability inside its transaction and stamps a short confirmation code. Migration 0006 adds a GiST exclusion constraint on `(staff_id, tstzrange(starts_at, ends_at))` for active statuses, so a concurrent loser gets SQLSTATE `JH409` (slot taken); `JH429` means too many open holds from one client. Migration 0009 gives every booking a `hold_token` (stored in an HttpOnly cookie by `createBooking`, required by every later mutation and by the pay and confirmation pages) and adds the row-locked `record_payment`, `cancel_unpaid_booking` and `release_checkout_session` functions plus a sweeper for stale holds.

Contact details and payment are collected on the pay page. A card payment is recorded by the webhook (`checkout.session.completed` and `async_payment_succeeded`) and, independently, when the guest returns and the confirmation page verifies the Checkout session. Without `STRIPE_WEBHOOK_SECRET` the webhook answers 503 and only the return path applies. Details and the manual refund step are in [supabase.md](supabase.md).

Booking state lives in the URL (`?service&staff&date&time&step`); `BookingFlow` derives the current step with a fallback so a hand-edited `step` never strands the user. The client slot cache prefetches 14 days through `get_day_availability`, and the grid only renders once the cached data matches the selected day and specialist.

## Regression testing

```bash
npm run playwright:install   # once
npm run test:smoke           # seconds: routes respond, access rules hold, layout and a11y checks
npm run test:e2e             # 1-2 min: book, pay, confirm, clean up
```

- **`tests/smoke/`** is read-only: route and 404 checks (unknown pay and confirmation ids return a real 404), direct public-key calls proving the booking functions and guest data are closed, booking UI, layout invariants, and an axe accessibility scan in light and dark. It also runs on a Pixel 7 sized `mobile` project.
- **`tests/e2e/`** drives real Chromium through catalog, pay-at-salon booking, pay-now with Stripe's `4242...` test card, and step-tab / Back navigation. The Stripe test skips itself if the deployment has no `STRIPE_SECRET_KEY`. Every test that creates an appointment deletes exactly that row afterwards (`tests/support/cleanup.ts`, service-role key), pass or fail.
- Some access-rule assertions only hold once migration 0007 is applied to the project under test (see [supabase.md](supabase.md)).

### CI

- [`ci.yml`](../.github/workflows/ci.yml): on every pull request and push to `main`, runs `db:setup:check`, `test:db`, `test:unit`, lint, typecheck and a production build. Needs no secrets. An advisory `npm audit` runs first.
- [`smoke-pr.yml`](../.github/workflows/smoke-pr.yml): job `smoke` waits for the PR's Vercel preview, then runs the smoke suite and `check:flow` against it. If Vercel Authentication protects previews it needs the `VERCEL_AUTOMATION_BYPASS_SECRET` secret (see CODE_REVIEW.md #40).
- [`regression.yml`](../.github/workflows/regression.yml): on the `deployment_status` event for production deploys, runs smoke plus end to end. Secrets: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Failed runs upload the HTML report (trace and screenshot).

## Quality gates

- `npm run check` (ESLint with `--max-warnings 0`, then `tsc --noEmit`) is expected clean on every commit.
- Before a pull request also run `npm run build`; CI repeats all of it.
- Changes to the schema go in a new numbered migration file, followed by `npm run db:setup`. Never hand-edit `supabase/setup.sql`, and never edit an applied migration.

## Known issues

[`CODE_REVIEW.md`](../CODE_REVIEW.md) tracks every finding with its status and fix direction. Most of the earlier high-severity items (double-booking guard, bare-id mutations, abandon-versus-payment race, missing CI gate, the 200-instead-of-404 pages) are marked fixed there; some fixes need migrations `0007`-`0009` applied to the live project by its owner. Still open, in rough order of importance:

- The Content-Security-Policy is report-only and allows inline scripts (#28).
- The per-client open-hold cap is a brake, not a rate limiter; real rate limiting belongs at the edge (#31).
- The confirmation page promises an email that is never sent (#32).
- No error-monitoring service is connected (#8, #33).
- The e2e suite writes to the shared live database; a staging project would fix that (#34).
- Supabase's legacy `anon` / `service_role` keys are being deprecated; migrating is a rename in `src/lib/supabase/server.ts` (#35).
- No hold-expiry countdown on the pay step (#36).
