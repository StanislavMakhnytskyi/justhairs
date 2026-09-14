# justhairs

**A production-grade booking product for a unisex hair salon — not a template, not a brochure site.**

Built the way a real SaaS is built: a Postgres booking engine that can't double-book, a
mobile-first flow that goes from "I need a haircut" to a confirmed appointment in four
taps, and a codebase where performance, accessibility, and maintainability were design
constraints from commit one — not a cleanup pass at the end.

> Live demo: [justhairs.vercel.app](https://justhairs.vercel.app) · Stack: Next.js 16 · React 19 · Tailwind v4 · Supabase · Stripe

---

## Why this project is worth a look if you're hiring

This is a portfolio piece that demonstrates how I ship client work. A few things I'd
point a prospective client at:

### ⚡ It's fast — and stays fast

- **Static-first rendering.** Every public page (home, services, service detail, team,
  the booking flow) is prerendered at build time and served from the edge with
  `revalidate` / ISR — no server round-trip, no database hit on the hot path. Only the
  payment and confirmation pages, which read one live appointment, are dynamic.
- **Real LCP engineering.** The hero image ships a `preload` + `fetchPriority="high"`
  hint so the browser starts fetching it before it parses the CSS. Below-the-fold
  imagery lazy-loads with tiny inline base64 blur previews (`next/image` placeholder)
  generated at build time — no layout shift, no flash of empty box.
- **Prefetched booking slots.** When you open a service, the next few days of
  availability are already being fetched in the background through a
  `useSyncExternalStore`-backed cache, so the date and time steps feel instant and the
  "next available" quick-picks are ready before you ask for them.
- **Zero-CLS, motion-aware UI.** Skeleton states match final layout dimensions;
  transitions respect `prefers-reduced-motion`; navigation shows a pending bar so a
  slow network never looks like a dead tap.

### ♿ Accessibility is built in, not bolted on

- Passes **Lighthouse accessibility** and **WCAG 2.1 AA contrast** across the app —
  muted-text tokens are tuned to clear 4.5:1, not eyeballed.
- Proper landmark structure (`<main>`, labelled regions), single consistent
  focus-visible ring on every interactive element, and 44px minimum touch targets.
- Single-select controls (date strip, time grid) use real
  `role="radiogroup"` / `role="radio"` semantics, so screen readers announce them
  correctly and arrow-key navigation works.
- Hardware/browser **Back walks the booking steps** instead of dumping you out of the
  flow — history is managed deliberately.

### 🏗️ Architecture a team can live with

- **A design system, not a pile of components.** One elevation language (raised cards
  vs. selectable controls vs. inset panels — each with exactly one visual treatment),
  one spacing scale driven by a single `--gutter` token, one real typographic scale.
  Pages *compose*; they don't style.
- **Type-safe end to end.** TypeScript in `--strict`, Zod-validated server actions,
  hand-authored domain types over the Supabase schema, `tsc --noEmit` and
  `eslint --max-warnings 0` green on every commit (React Compiler lint rules included).
- **Security-first data layer.** Row-Level Security on every table; availability and
  booking logic lives in `SECURITY DEFINER` Postgres functions that re-check everything
  server-side, so the client can't over-book by racing the UI. Appointment rows carry
  contact details and are never exposed to the anon key — the app reads a single
  appointment server-side with the service-role key.
- **No accounts, no friction.** Booking is guest checkout: the slot is held the moment
  you confirm, then one screen collects contact details and either takes payment
  through **Stripe Checkout** (test mode) or records "pay at the salon". The
  confirmation page verifies the returning Checkout session and marks the
  appointment paid — no webhook endpoint, runs on any hosting tier.
- **Honest scoping.** The client booking + payment flow is complete and polished.
  Notification delivery and the admin panel have their schema in place and ship in
  later milestones — no half-finished screens in the demo.

### 🧰 Developer experience

- One `npm install`, one `.env.local`, three SQL files — running locally in minutes.
- Idempotent seed + demo-data scripts, a catalog-sync script for pushing content
  changes to a live DB, and a blur-preview generator. All documented below.
- Deploys to Vercel + hosted Supabase with no custom infrastructure.

---

## What's in this build

Home → Services → 4-step booking (service → specialist → date → time) → review →
confirm → **payment page** (Stripe Checkout, or "pay after the service") →
confirmation with a reference code.

Plus: service photography with blur-up loading, ratings surfaced on Home / team /
service pages, full loading & error states, dark mode, real map + "open in device
maps", and page metadata / OG images.

Notification delivery and the admin panel are scoped for later milestones — tables
exist; nothing half-built ships in the demo.

## Stack

| Concern       | Choice                                                                             |
| ------------- | --------------------------------------------------------------------------------- |
| Framework     | Next.js 16, App Router, React 19, TypeScript (strict)                            |
| Styling       | Tailwind v4 (`@theme` in `globals.css`) + design tokens in `src/styles/tokens.css` |
| UI components | Local design-system library in `src/components/ui`                               |
| Data          | Supabase (Postgres + Row-Level Security)                                         |
| Payments      | Stripe Checkout (test mode), session verified on return — no webhook            |
| Validation    | Zod-validated server actions                                                     |
| Analytics     | Vercel Analytics                                                                 |
| Hosting       | Vercel + hosted Supabase                                                         |

## Local setup

1. **Install**

   ```bash
   npm install
   ```

2. **Create a Supabase project** at https://supabase.com, then copy
   `.env.example` to `.env.local` and fill in:

   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Project Settings → API
   - `SUPABASE_SERVICE_ROLE_KEY` — same page (server-only)

3. **Apply the schema and seed.** In the Supabase SQL editor, run in order:

   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_reviews_and_cron.sql`
   - `supabase/migrations/0003_guest_booking_no_auth.sql`
   - `supabase/migrations/0004_day_availability.sql`
   - `supabase/seed.sql`

   (Or, with the Supabase CLI linked: `supabase db push` then
   `psql "$DATABASE_URL" -f supabase/seed.sql`.)

   `0002` schedules an hourly `pg_cron` job to mark finished appointments
   `completed`. If `create extension pg_cron` errors, enable **pg_cron** first
   under Database → Extensions, then re-run `0002`. `0003` removes the auth
   dependency: `book_appointment` becomes anon-callable and appointments carry
   guest contact details + a payment status.

4. **Stripe (test mode, optional).** Card payments on the booking flow use Stripe
   Checkout (hosted redirect). There is **no webhook** — the confirmation page
   verifies the session with Stripe on return and marks the appointment paid.

   - Create a free Stripe account, stay in **test mode**
     (dashboard.stripe.com/test/apikeys), and put the secret key in `.env.local`:
     `STRIPE_SECRET_KEY=sk_test_…`.
   - That's the only Stripe variable. Without it the flow still works — "Pay now"
     just reports that card payments aren't set up; "pay after the service" is
     unaffected.

5. **Demo data** (optional — past visits + reviews so the UI has real content):

   ```bash
   node --env-file=.env.local scripts/seed-demo.mjs
   ```

   Inserts guest appointments tagged `*@justhairs.test` (completed visits with
   reviews, plus near-term reservations so the time grid shows held slots).
   Idempotent — each run clears the previous demo rows first.

6. **Regenerate image blur previews** (only when the imagery in the Storage
   `assets` bucket changes):

   ```bash
   node --env-file=.env.local scripts/gen-blur.mjs
   ```

   Writes `src/lib/blur.generated.ts` — tiny base64 previews that `next/image`
   shows while the real photo loads. Commit the result.

7. **Regenerate DB types** (optional but recommended once the schema is live):

   ```bash
   npx supabase gen types typescript --project-id <ref> > src/lib/supabase/types.gen.ts
   ```

   The app currently uses hand-authored domain types in `src/lib/supabase/types.ts`.

8. **Run**

   ```bash
   npm run dev
   ```

## Deployment (Vercel)

1. Push to GitHub, import the repo in Vercel.
2. Add every variable from `.env.example` in the Vercel project settings, with
   `NEXT_PUBLIC_SITE_URL` set to the deployed URL (Stripe redirects back to it).
3. That's it — no webhook endpoint to register. Works on Vercel's free plan.

## Regression testing

Playwright, run against the real deployed site (never localhost) — a fast
route/RPC smoke suite, and a slower end-to-end suite that clicks through the
guest-booking flow for real, including a Stripe **test-mode** payment.

```bash
npx playwright install chromium   # once
npm run test:smoke                # ~seconds — routes 200/404, RPCs callable
npm run test:e2e                  # ~1-2 min — books, pays, confirms, cleans up
```

Both default to `TEST_PROD_URL` from `.env.local`; append `:preview` to target
`TEST_PREVIEW_URL` instead (a Vercel preview deploy) — e.g.
`npm run test:e2e:preview`.

- **`tests/smoke/`** — no browser, just HTTP + a direct anon-key RPC call.
  Checks every public route responds, and that `get_available_slots` /
  `get_day_availability` (migrations `0003`/`0004`) are actually deployed.
  It also asserts that `/book/pay/<bogus-id>` and `/book/confirmation/<bogus-id>`
  currently render "Page not found" with an HTTP **200**, not a 404 — a known
  bug ([`CODE_REVIEW.md` #19](./CODE_REVIEW.md)), asserted as today's actual
  behavior on purpose so the suite would catch it getting worse, not to
  imply it's correct.
- **`tests/e2e/`** — real Chromium, drives the UI: picks the first service,
  "Any specialist", the earliest open day/time (falling back to a "Next
  available" chip if the first day picked is full), fills the guest-details
  form with a `e2e+<timestamp>@justhairs.test` email (same tagging convention
  as `scripts/seed-demo.mjs`), and either chooses "pay after the service" or
  pays with Stripe's `4242 4242 4242 4242` test card. Also covers the
  clickable step-tabs / back-button behaviour.
- Every test that reaches `createBooking` records the appointment id and
  deletes exactly that row afterward (`tests/support/cleanup.ts`, service-role
  key) — nothing is left behind in the database, pass or fail.
- `tests/e2e/booking-pay-now.spec.ts` drives Stripe's hosted Checkout page
  directly and is the one most likely to need updating if Stripe changes that
  page's markup; it skips itself automatically if `STRIPE_SECRET_KEY` isn't
  configured on the deployment under test.

**CI:** `.github/workflows/regression.yml` triggers on a GitHub deployment
status (which Vercel's integration posts after every deploy — preview and
production) rather than on push, so it always tests the URL that actually
finished building. The smoke suite runs for every deployment; the e2e suite
only for a production one. Needs three repo secrets:
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY` (the last only for e2e's cleanup step). A failing
run's HTML report (with trace + screenshot) is attached to the workflow as an
artifact.

## Project layout

```
src/
  app/
    page.tsx                     Home
    services/                    Service list + detail (static / ISR)
    masters/                     Team (static / ISR)
    book/                        4-step flow (BookingFlow.tsx)
    book/pay/[id]/               Guest details + Stripe Checkout / pay-later
    book/confirmation/[id]/      Reference code + status (reconciles the Stripe session)
  components/
    ui/                          Design-system component library (Tailwind v4)
    layout/                      AppShell
    marketing/                   Hero, VisitUs, map, footer
    theme/                       Theme script + toggle
  lib/
    supabase/                    server.ts (anon + service-role clients), types
    actions/booking.ts           Zod-validated server actions (book, pay, checkout)
    slot-cache.ts                useSyncExternalStore availability cache
    queries.ts                   Catalog data access
    appointments.ts              Single-appointment read + Stripe session reconcile
    stripe.ts                    Stripe client (null without a key)
    format.ts, cn.ts, tv.ts      Helpers + design-system utilities
supabase/
  migrations/0001_init.sql       Schema, RLS, booking-engine RPCs
  migrations/0002_reviews_and_cron.sql  Review guard, rating views, pg_cron
  migrations/0003_guest_booking_no_auth.sql  Drop auth; guest bookings + payment status
  migrations/0004_day_availability.sql  get_day_availability — one round trip for a date range
  seed.sql                       Demo salon, services, staff, hours
scripts/
  seed-demo.mjs                  Optional: demo guest visits, reviews, reservations
  sync-catalog.mjs               Push catalog changes to a live DB
  gen-blur.mjs                   Regenerate image blur previews
tests/
  smoke/                        Route + RPC checks (no browser)
  e2e/                          Full booking + Stripe-test-mode-payment flows
  support/                      Shared step-through-the-flow + cleanup helpers
playwright.config.ts            baseURL from TEST_PROD_URL / TEST_PREVIEW_URL
.github/workflows/regression.yml  Runs the suites above after each deploy
```

## Booking engine

`get_available_slots(service_id, staff_id, day)` and `book_appointment(...)` are
`SECURITY DEFINER` Postgres functions (in the migrations), callable by the anon role.
Slots are generated from each staff member's `staff_working_hours` for that weekday,
minus `staff_time_off` and existing appointments, stepped by
`app_settings.slot_step_min`. "Any specialist" collapses to distinct times and a
concrete stylist is assigned at booking time. `book_appointment` re-checks availability
inside the transaction to guard against double-booking — the UI can't race it — and
stamps a short confirmation code. Contact details and payment are collected on the
next screen; if the guest pays by card, the confirmation page verifies the Stripe
Checkout session on return and flips `payment_status` to `paid` (no webhook).

---

### Like what you see?

I build web apps like this for clients — booking systems, storefronts, dashboards,
internal tools. Fast, accessible, type-safe, and handed over with documentation a team
can actually run. Get in touch.
