# Code review — known issues & deferred tradeoffs

A self-review pass over the whole project, done the way an outside senior
engineer would: looking for real bugs and gaps, not style preferences. This is
the tracked list of what's known: entries marked **Fixed** are resolved in the
code (some pending a migration the owner has to apply), the rest are open —
those tagged _planned: P3_ are scheduled for the next pass. The most load-bearing findings are also
marked inline in the code as `// KNOWN ISSUE (CODE_REVIEW.md #N)` (a real bug
or gap) or `// TODO (CODE_REVIEW.md #N)` (a deliberate simplification, not
currently broken), so the reasoning lives next to the code it's about.

Severity: **High** = can lose money/data or strand a real user with no
recovery path. **Medium** = real bug or gap, bounded impact. **Low** = worth
fixing, not urgent.

## A. Booking-engine concurrency / data integrity

### 1. `book_appointment` has no DB-level double-booking guard — High — **Fixed**
_Migration 0006 adds a GiST exclusion constraint on `(staff_id, tstzrange(starts_at, ends_at))` for active statuses; a losing concurrent caller gets the distinct SQLSTATE `JH409`. Covered by `npm run test:db`. (The comment in `0003` still carries the old marker: that migration is immutable, and the constraint supersedes it.)_

`supabase/migrations/0001_init.sql` (function `book_appointment`, carried
forward in `0003_guest_booking_no_auth.sql`). The function checks
`not exists (... overlapping appointments ...)` and then `insert`s, all
inside one `plpgsql` call, but under Postgres's default `READ COMMITTED`
isolation there's no lock stopping two concurrent calls for the *same*
staff+slot from both passing the check before either commits — two
appointments for the same person at the same time. The client-side cache
race fixed earlier in `slot-cache.ts` protected the UI's *display* of
availability; this is the server-side gap that actually enforces it.
**Fix direction:** add a `GiST` exclusion constraint on
`(staff_id, tstzrange(starts_at, ends_at))` for active statuses, or
`SELECT ... FOR UPDATE` the conflicting rows before inserting.

### 2. `abandonBooking` can delete a booking that just got paid — High — **Fixed (pending 0009)**
_`abandonBooking` now expires the Checkout session, then cancels through `cancel_unpaid_booking` (row lock, refuses a paid row); it never deletes a row with a session, and it only acts on confirmed + unpaid rows. Pay-at-salon (`pay_later`) bookings are intentional and are not swept (the per-client open-hold cap bounds abuse); `payLater` expires any open Checkout session first. The Stripe webhook (`/api/stripe/webhook` -> `record_payment`) reconciles payments independently of the browser._

`src/lib/actions/booking.ts`. It retrieves the Stripe session, decides "not
paid," and only *then* deletes the row. If the guest finishes paying on
Stripe's hosted page in that window, the row is deleted after being paid for
— the appointment is gone but the charge went through, and there's no webhook
to reconcile it after the fact.
**Fix direction:** make the "still unpaid" check and the delete one atomic
statement/transaction, and alert on deleting any row with a non-null
`stripe_session_id`.

### 3. `abandonBooking` / `payLater` / `startCheckout` trust a bare appointment id — High — **Fixed (pending 0009)**
_Each hold now has a `hold_token` (migration 0009) that `createBooking` stores in an HttpOnly cookie; every mutation and the pay/confirmation pages require it. A bare id opens nothing._

Same file. Unlike `createBooking`/`saveGuestDetails`, these three take
`appointmentId: string` with no schema validation and no proof the caller is
the guest who created the hold. Anyone who obtains the UUID (a shared link,
browser history, a log line) can cancel, mark-paid-later, or open a Checkout
session for someone else's booking. Impact is bounded by UUIDs not being
enumerable, but it's inconsistent with the rest of the file.
**Fix direction:** validate with the same `id` (`z.guid()`) schema everywhere;
consider a per-hold secret (signed cookie or a `hold_token` column) for
mutations.

### 4. `loadSlots` didn't check its result was still wanted when it resolved — Medium — **Fixed**
`src/app/book/BookingFlow.tsx`. Confirmed live on prod from a screen
recording: pick a day, every slot shows crossed out (the grid is holding a
previous selection's data); re-tap the same day and it corrects itself. Two
things were needed, not one:
- `loadSlotsGeneration` (a ref counter) tags every `loadSlots` call and
  drops a result that arrives after a newer call has superseded it — closes
  the case of two competing fetches (day A's slow fetch landing after day
  B's fast/cached one).
- `slotsFor` records which `(day, staff)` `slots` actually reflects, and the
  grid only renders once that matches the URL's current `(date, staff)` —
  otherwise it shows the loading skeleton. This closes the other half: the
  URL params (`useSearchParams()`, updated via a router navigation) and
  `slots` (updated via a resolved fetch) are two independently-timed
  mechanisms and can briefly disagree about which selection is current even
  with only *one* fetch in flight — the first fix alone didn't cover that,
  which is why the bug still reproduced on prod after it shipped.

## B. Error handling / diagnosability

### 5. Booking-failure classification is a substring match on Postgres text — Medium — **Fixed**
_`createBooking` switches on `error.code` (`JH409` slot taken, `JH429` too many holds); any other DB error is logged and reported generically._

`src/lib/actions/booking.ts`, `createBooking`. `error.message.includes("no
longer available")` silently buckets every *other* DB error (constraint
violations, connection issues) into the same generic "Could not create the
booking" — a real outage looks identical to a normal retry-and-it-works
hiccup, with nothing logged to tell them apart.
**Fix direction:** switch on `error.code`/a distinct `errcode` raised by the
RPC instead of matching message text.

### 6. `startCheckout`'s Stripe call has a blanket `catch {}` — Medium — **Fixed**
_Errors are logged with Stripe's type/code; sessions are reused, expire after ~31 min and carry an idempotency key._

Same file. A bad amount, an expired key, a network blip, and a genuine Stripe
outage all collapse into one "Could not start checkout" with no server-side
log — impossible to tell "user should retry" from "someone should look at
this now."

### 7. `getAvailableSlots` / `getDayAvailability` don't follow the file's own contract — Low
Same file. Every other exported action returns `ActionResult` (`{ok, ...}`);
these two `throw` instead. Works today because callers already expect it, but
it's a landmine for whoever adds a new caller assuming the same shape as
everything else in the module.

### 8. No error monitoring in production — Medium
`src/app/error.tsx`. The error boundary only `console.error`s. There is no
Sentry/log-forwarding/alerting anywhere in the stack — a production error is
invisible until a customer reports it.

## C. Data access / performance

### 9. `getOverallRating` averages in Node instead of in SQL — Medium — **Fixed**
_Now reads the one-row `overall_rating` view (migration 0007); falls back to the old calculation until the migration is applied._

`src/lib/reviews.ts`. Pulls every review row over the wire to compute one
number, when the codebase already has the right pattern one function away
(`service_ratings`/`staff_ratings`, migration `0002`). Fine at current scale,
gets slower/costlier as reviews grow for no reason.

### 10. Untyped `as` casts on Supabase join results — Low — **Fixed**
_The Supabase client is typed with `Database` (`src/lib/supabase/database.types.ts`, kept in sync with the schema by `tests/db/types.test.mjs`) and the casts are gone._

`src/lib/actions/booking.ts` (`loadPayable`) and `src/lib/queries.ts`
(`getCatalog`'s `as unknown as ServiceWithCategory[]`). These trust the
query's shape at compile time only; a renamed column or a changed embed
cardinality (Supabase can return a join as an object or an array depending on
FK inference) fails silently with `undefined` fields instead of a type error.

### 11. `loadWindow` doesn't dedup in-flight requests — Low
`src/lib/slot-cache.ts`. Two calls for overlapping day ranges (e.g. staff
toggled quickly) each compute `missing` from the same snapshot before either
awaits, so both hit the network for the same days — the exact kind of
duplicate fetch this cache exists to avoid, just via a different path than
the overwrite bug that was already fixed.

## D. Dead code / product-copy drift

### 12. Auth-era schema is still in the database — Low — **Fixed, pending apply**
_Migration 0007 closes these tables to the API; the optional, destructive `0008_drop_unused_auth_schema.sql` drops them._

`supabase/migrations/0001_init.sql`. `profiles`, `orders`, `order_items`,
`payments`, `favorites`, `notifications`, `is_admin()` and their RLS policies
are all dead since auth was removed (`0003_guest_booking_no_auth.sql`) —
nothing in `src/` references any of them. Harmless, just confusing for
anyone reading the schema cold.

### 13. Service detail page shows a "deposit" that checkout never charges — Low
`src/app/services/[slug]/page.tsx`. Displays `"{price} deposit"` when
`deposit_cents` is set, but `startCheckout` always charges the full
`price_cents` — the copy promises a partial-payment option that isn't wired
up anywhere.

### 14. No self-service reschedule/cancel — confirmed deliberate, not a gap — Low
`src/app/book/confirmation/[id]/page.tsx` tells guests to call the salon,
because `reschedule_appointment`/`cancel_appointment` were dropped in `0003`
with the rest of the auth surface and never replaced. Flagging so it reads as
an intentional product decision, not an oversight, if anyone re-reads the
migration history.

## E. Frontend correctness / accessibility

### 15. An unrecognized `?step=` can strand the user on a blank flow — High — **Fixed**
_`BookingFlow` falls back to the first step whose inputs are missing, and never shows a step whose inputs are absent._

`src/app/book/BookingFlow.tsx`. `step` is taken directly from
`STEPS.findIndex(...)` on the URL param with no fallback; a garbage or
hand-edited `?step=` value produces `-1`, and none of the `step === 0..3`
branches render — no service list, no error, no way back except leaving the
page.
**Fix direction:** fall back to inferring the step from which fields are
actually filled when the URL value doesn't match a known step.

### 16. Booking-confirm error isn't announced to screen readers — Low — **Fixed**
_The step-3 error paragraph now has `role="alert"`._

`src/app/book/BookingFlow.tsx`, the step-3 error paragraph. Missing
`role="alert"` — inconsistent with the equivalent error text in `PayForm`,
which has it. A screen-reader user who fails to confirm gets no auditory
feedback at all.

### 17. A failed `abandonBooking` leaves the back button silently dead — Medium — **Fixed**
_`PayTopBar` catches a rejected or refused `abandonBooking`, stays on the page and shows an alert (`UNREACHABLE` or the server's message)._

`src/app/(secure)/book/pay/[id]/PayTopBar.tsx`. If the server action rejects (network
blip), `router.push` never runs and nothing tells the user anything went
wrong — the back arrow just does nothing.

### 18. `/services` renders nothing until hydration — Low — **Fixed**
_The `Suspense` fallback is now the server-rendered service list (default tab as plain links), not `null`._

`src/app/services/page.tsx`, `<Suspense fallback={null}>`. Required because
`ServiceCategoryTabs` reads `useSearchParams()`, but `fallback={null}` means
the page's actual content — the service list — is an empty shell on first
paint. The codebase already has `SkeletonList` for exactly this.

## F. The 200-vs-404 bug (already caught by the regression suite)

### 19. `notFound()` returns HTTP 200 on `/book/pay/[id]` and `/book/confirmation/[id]` — Medium — **Fixed**
_The two pages moved into the `(secure)` route group (and the home page into `(home)`), so the unknown-id lookup now yields a real 404; `tests/smoke/routes.spec.ts` asserts it._

`src/lib/appointments.ts` (`getAppointment`) plus both page components. Next
commits the response status before the async appointment lookup's
`notFound()` throws, so a nonexistent id renders "Page not found" correctly
but with a 200 status. A genuinely unmatched route 404s fine — this is
specific to these two `force-dynamic` pages. Already documented and asserted
(as current, not correct, behavior) in `tests/smoke/routes.spec.ts`.

### 20. README overstated this as already-correct — fixed as part of this pass
The "Regression testing" section previously read as if these routes already
404. Corrected to describe the actual (wrong) 200 status and link back here,
matching what the test file itself says.

## G. Project / tooling

### 21. No CI gate on pull requests — High — **Fixed**
_`.github/workflows/ci.yml` runs lint, typecheck and a production build on every PR and on pushes to `main`._

PRs get the Playwright smoke suite (`smoke-pr.yml`, against the Vercel
preview), but there is still no `lint`/`tsc --noEmit`/`build` check on PRs
themselves. A broken build can merge; the only signal is Vercel's own build
failing, which produces no GitHub check on the PR.

### 22. `sharp` is used but not declared — Medium — **Fixed**
_`sharp` is declared in `package.json`._

`scripts/gen-blur.mjs` imports `sharp` directly; it's not in
`package.json` at all, only present because Next pulls it in transitively.
Works today by accident — stops working the moment that transitive
dependency changes.

### 23. Zero unit/integration test coverage — Medium — **Partly fixed**
_`npm run test:db` runs every migration and the seed on an in-memory Postgres (PGlite) and tests the booking engine, grants/RLS, functions, indexes and the generated types — no live project needed, and it runs in CI. The app itself is still covered only by the Playwright suite._

All correctness coverage (`tests/`) is live-site Playwright E2E on the happy
path. The booking engine's actual business rules (slot generation, the
double-booking check in #1, Zod validation edges) have no test that runs
without a live deployment and a live Supabase project.

## H. Supabase usage audit (this pass)

Found by reading every migration against Supabase's own advisor rules and
RLS/function guidance, then proven with `npm run test:db`. Details and the
access model are in [docs/supabase.md](docs/supabase.md). **Fixed in code and in
`0007_harden_and_index.sql`; the migration is not applied to the live project
until its owner runs it.**

### 24. The booking functions were callable by anyone holding the public key — High — **Fixed (pending 0007)**
`book_appointment`, `get_available_slots` and `get_day_availability` were
granted to `anon`, so `/rest/v1/rpc/...` accepted direct calls that skipped the
app's Zod validation — enough to flood the calendar with holds. Every call
already came from the Next.js server, so they are now `service_role`-only and
the actions use the server client. (Advisor 0028.)

### 25. `reviews` exposed `appointment_id` publicly — High — **Fixed (pending 0007)**
A guest's confirmation page (name + email) is addressed by appointment id, and
the public `reviews` table listed those ids. Only the display columns are
granted to the API roles now; `appointment_id` is not readable.

### 26. Grants relied on RLS alone; policies named no role — Medium — **Fixed (pending 0007)**
Every table granted full DML to `anon`/`authenticated`, with policies that
applied to every role and called `auth.uid()`/`is_admin()` per row (advisors
0003, 0024). Everything is revoked and only the catalog reads are re-granted;
policies name `anon, authenticated`. `staff_time_off` (leave reasons) and
`app_settings` are no longer public.

### 27. `search_path` and missing foreign-key indexes — Medium — **Fixed (pending 0007)**
Functions used `search_path = public` (or none) — now `''` with qualified
names (advisor 0011). Seven foreign keys had no index and one index was dead
(advisors 0001, 0005); pgcrypto sat in `public` (0014).

## I. Open items from the P1/P2 audit

Found while hardening payments, holds and headers. None of these is a regression
from the fixes above; they are the gaps that remain. Items tagged _planned: P3_
are scheduled for the next pass.

### 28. The CSP is report-only and allows `'unsafe-inline'` scripts — Medium
`next.config.ts`. The policy ships as `Content-Security-Policy-Report-Only`, and
`script-src` includes `'unsafe-inline'` because the pages are statically
generated / ISR and cannot carry a per-request nonce. It reports but blocks
nothing, and inline scripts are not restricted.
**Fix direction:** watch the reports, then enforce; move to nonces or hashes if
the pages can become dynamic.

### 29. Environment validation is non-fatal — Low
`src/lib/env.ts`, `src/instrumentation.ts`. A missing or malformed variable is
logged at start-up and surfaced as 503 from `/api/health`, but the app still
boots and the affected features fail at request time. Deliberate (builds and CI
run without secrets); the cost is that a bad deploy is not stopped by the app
itself.
**Fix direction:** fail the deploy from a post-deploy health check.

### 30. Home "Open today" can be up to 10 minutes stale — Low
`src/app/(home)/page.tsx` is ISR (`revalidate = 600`), so the open/closed badge
can lag a schedule change or the opening time by up to ten minutes.
**Fix direction:** compute the badge on the client, or shorten the revalidate
window.

### 31. The per-client hold cap keys on the platform IP; real rate limiting belongs at the edge — Medium
`src/lib/actions/booking.ts` (`clientKey`). The open-hold cap hashes the
platform-set address (`x-vercel-forwarded-for`) and is skipped entirely off
Vercel. It bounds casual abuse but is not a rate limiter: shared NATs share a
budget and a determined caller rotates addresses.
**Fix direction:** Vercel Firewall rate limits and/or Turnstile on `createBooking`.

### 32. The confirmation page promises an email that is never sent — Medium — _planned: P3_
`src/app/(secure)/book/confirmation/[id]/page.tsx` says "A confirmation is on
its way to ..." but no email is sent. Until one is, the copy must not promise it.

### 33. No monitoring SDK is wired — Medium
`src/instrumentation.ts` logs every server error as structured JSON through
`onRequestError`, and `src/app/error.tsx` still only `console.error`s (see #8).
The hook point exists; no Sentry (or similar) is connected, so nothing alerts.

### 34. The e2e suite writes to the live database — Medium
`tests/e2e` books and pays against whatever project the env points at, which
today is the shared live one. **Fix direction:** a separate staging Supabase
project (and Stripe test account) for e2e and previews.

### 35. Legacy Supabase `anon` / `service_role` keys — Low
Supabase is deprecating the legacy keys by the end of 2026. Migrating to the
`sb_publishable_` / `sb_secret_` keys is a dashboard + Vercel env change and a
rename in `src/lib/supabase/server.ts` (see [docs/supabase.md](docs/supabase.md)).

### 36. No hold-expiry countdown or recovery UX on the pay step — Low — _planned: P3_
A guest holding a slot is not told how long the hold lasts, and when it lapses
or is lost the pay page gives little guidance. Related UX items (clearer
failure/expired states, back-button error feedback from #17) are planned for P3.

### 37. Date strip has no per-day fallback when the window lookup fails — Low
`src/lib/slot-cache.ts` `loadWindow`. If `get_day_availability` fails, the old
per-day `getAvailableSlots` fallback loop was removed (it queued server actions
behind each other — non-negotiable 3). Days now stay "unknown" (not disabled),
"Next available" times out, and only the viewed day loads (one call). Acceptable
degraded mode; a real fix is making the range RPC reliable (migration applied).

### 38. Dev server serves `no-cache` on the secure 404s — Low (dev only)
`next dev` overrides `Cache-Control` on dynamic responses, so the pay /
confirmation 404s show `no-cache, must-revalidate` locally even though
`next.config.ts` `headers()` sets `no-store`. Verified on a production build
(`next start`): both bogus-id 404s return `Cache-Control: no-store`. The 200
path matches the same `source` patterns, so it gets the same header; not
exercised with a real booking.

### 39. TextField error text is not `role="alert"` — Low
`aria-describedby` already reads the message when the field is focused, and the
pay form moves focus to the first invalid field on submit, so adding `role="alert"`
would announce it twice. Left as is; revisit if errors appear without a focus move.

### 40. CI preview protection: Vercel Authentication blocks the PR smoke job — Medium
`.github/workflows/smoke-pr.yml`, `playwright.config.ts`. If Vercel Authentication
is on for Preview deployments, `/api/health` and every browser test get the
login wall. Fix: in Vercel project > Settings > Deployment Protection >
Protection Bypass for Automation, create a secret and store it as the GitHub
Actions secret `VERCEL_AUTOMATION_BYPASS_SECRET` (or turn Vercel Authentication
off for Previews). The warm-up step sends it as `x-vercel-protection-bypass`
(masked in logs); Playwright exchanges it once for the `_vercel_jwt` cookie and
loads it as `storageState`, so it is scoped to the preview host and never sent
to Stripe or other third-party origins. Without the secret the job fails with an
explicit `::error::` instead of a confusing health failure. Not yet exercised on
a live run.
