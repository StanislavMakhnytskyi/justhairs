# How justhairs uses Supabase

What the project does with Supabase, why, and the rules to keep it that way. Grounded in Supabase's own guidance (Data API security, Row Level Security, database functions, advisors/linter, type generation, migrations). Enforced by `npm run test:db`, which runs every migration and the seed on an in-memory Postgres — no live project needed.

## The access model

There is no sign-in. Two keys, two very different powers:

| | Key (env var) | Postgres role | Used by | Can |
| --- | --- | --- | --- | --- |
| **Public** | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` | `createPublicClient()` — catalog and rating reads on the server | `SELECT` on the catalog tables and rating views; the display columns of `reviews`. Nothing else. |
| **Server** | `SUPABASE_SERVICE_ROLE_KEY` | `service_role` (bypasses RLS) | `createAdminClient()` — server-only (`import "server-only"`) | Everything private: the booking functions, reading/updating `appointments` (guest PII), recording payments. |

So the browser-visible key reaches **only** the public catalog. The booking functions (`book_appointment`, `get_available_slots`, `get_day_availability`) are `service_role`-only: they are called from Next.js server actions, never from the browser, so there is no reason for the public key to reach them (direct `/rest/v1/rpc/...` calls would skip the app's validation).

`appointments`, `app_settings` and `staff_time_off` have RLS on and **no** policy and no grant for the API roles — closed. `reviews.appointment_id` is not readable (it addresses a guest's confirmation page).

## Rules for any database change

1. **Grants and RLS are separate layers.** Revoke what isn't needed (`revoke all … from anon, authenticated`), then grant exactly what the app reads. New tables/functions start closed (default privileges are revoked in 0007).
2. **Every table has RLS on.** Policies name their role (`to anon, authenticated`), are one per operation, and never call `auth.*` per row (wrap in `(select auth.uid())` if auth ever returns).
3. **Functions**: `security definer` only when needed, always `set search_path = ''` and schema-qualified names inside; `revoke … from public, anon, authenticated` then grant to the roles that need it; `stable` where they only read.
4. **Views** are `security_invoker = true` so they respect the caller's RLS.
5. **Index every foreign key** (and anything a policy or a hot query filters on); partial indexes for the cron sweepers. `npm run test:db` fails on an unindexed FK.
6. **Extensions** go in `extensions`, not `public`.
7. **Expected business errors use a distinct SQLSTATE** (`JH409` = slot taken) so the app switches on `error.code`, not message text.
8. **Never change the live database by hand.** Schema changes are migration files; the owner applies them. `0001`–`0006` are applied and immutable. `0007`/`0008` are pending until the owner confirms (then add them to the guard in `.claude/hooks/guard.mjs`).

## Migrations

`supabase/migrations/NNNN_name.sql`, applied in order; `supabase/setup.sql` is the generated one-shot bundle (all migrations + seed) for a fresh project — `npm run db:setup` regenerates it and CI checks it is current. Every migration must be re-runnable.

| File | What it does |
| --- | --- |
| `0001`–`0006` | The original schema, booking engine, guest checkout, availability range, integrity hardening (applied). |
| `0007_harden_and_index` | **Safe, additive.** Server-only booking functions with `search_path = ''`; closed grants and rebuilt policies; `overall_rating` view; indexes; extension hygiene. Booking behaviour is unchanged. |
| `0008_drop_unused_auth_schema` | **Optional, destructive.** Drops the dead auth-era tables, the trigger on `auth.users` and the `customer_id` columns. Skip it to keep that data; 0007 already closes those tables. |
| `0009_payment_and_hold_integrity` | **Pending the owner's apply; apply after the new app build is deployed.** Per-booking `hold_token`; `stripe_session_expires_at`, `client_key`; row-locked `record_payment`, `cancel_unpaid_booking`, `release_checkout_session`; `book_appointment` gains an optional `p_client_key` and the open-hold cap; `checkout_attempt` (bumped when a session is released, feeds the Stripe idempotency key); `release_stale_holds` deletes sessionless unpaid holds after 30 min and cancels expired-session holds 6 h after the session expires (grace for a late webhook). Pay-at-salon (`pay_later`) bookings are intentional and never swept; abuse is bounded by the open-hold cap. `cancel_unpaid_booking` only acts on confirmed + unpaid rows (`not_cancellable` otherwise). Existing rows get tokens too (nobody holds their cookie, so old links stop opening - a demo-data consequence only). Without it the new build fails to book (`hold_token`/`p_client_key` missing). |

### Stripe webhook

`POST /api/stripe/webhook` verifies the signature on the raw body and handles `checkout.session.completed`, `checkout.session.async_payment_succeeded` (mark paid), `checkout.session.expired` and `checkout.session.async_payment_failed` (release the session) through the SQL functions above. Register it in the Stripe dashboard (test mode) for those four events and set `STRIPE_WEBHOOK_SECRET`; set `NEXT_PUBLIC_SITE_URL` too (checkout refuses to start in production without it). Without the secret the route answers 503 and payments are only recorded when the guest returns to the confirmation page. Mismatched, cancelled-booking and unknown-booking payments are logged with `console.error` (`[stripe] ... not applied (cancelled|mismatch|unknown)`) and answered 200 (a retry cannot fix them). **Manual refund step:** search the server logs for `not applied`, open the named `cs_...` session / its PaymentIntent in the Stripe dashboard and refund it, then, if the guest still wants the slot, re-book. This happens e.g. when a payment lands more than 6 hours after its session expired and the sweeper has already cancelled the hold.

### Applying 0007 / 0008 to the live project

1. Deploy the app code first. It calls the booking functions with the server key (works before **and** after 0007) and falls back if `overall_rating` doesn't exist yet. Applying 0007 first would make the *old* build's public-key calls fail with `permission denied`.
2. Run `0007_harden_and_index.sql` in the SQL editor (or `supabase db push`). Indexes are built non-concurrently, which is fine at this table size.
3. Optionally run `0008_drop_unused_auth_schema.sql`.
4. `npm run test:smoke` — `tests/smoke/rpcs.spec.ts` now asserts the public key *cannot* call the booking functions or read guest data, which only holds once 0007 is applied.

## Types

`src/lib/supabase/database.types.ts` has the shape `supabase gen types typescript` produces and types both clients, so queries and RPC calls are checked and the old `as unknown as` casts are gone. It is maintained by hand until the real output replaces it (`npm run types:gen`, needs `supabase login`); `tests/db/types.test.mjs` fails if it drifts from the schema. Domain aliases (`Service`, `Staff`, …) are in `src/lib/supabase/types.ts`.

## Testing without the live project

`tests/db/harness.mjs` boots PGlite (Postgres compiled to WebAssembly) with stand-ins for what Supabase provides (the three roles with Supabase's default grants, `auth.users`, the `extensions` schema, a no-op `pg_cron`), then applies the migrations and seed. `schema.test.mjs` is the advisor-style rule set plus booking behaviour (double-booking, 'any specialist', the booking window, the sweepers); `upgrade.test.mjs` applies 0007/0008 to a database that already has bookings and reviews; `types.test.mjs` keeps `database.types.ts` honest.

## Deliberately not done

- **New API keys** (`sb_publishable_` / `sb_secret_`). Supabase is deprecating the legacy `anon`/`service_role` keys by the end of 2026; migrating is a dashboard + Vercel env change and a rename in `src/lib/supabase/server.ts`. Do it before they are switched off.
- **Edge rate limiting / CAPTCHA.** 0009 adds only a cheap in-DB brake (at most 5 open holds per hashed IP per 24 h, SQLSTATE `JH429`). The IP comes only from the platform-set `x-vercel-forwarded-for` header (last hop) and only when running on Vercel; a raw `x-forwarded-for` / `x-real-ip` is client-controlled and is ignored, so elsewhere the cap is simply skipped (key null). This brake is not a rate limit: the real one belongs at the edge. Follow-ups, outside the repo: a Vercel Firewall rate-limit rule on `POST /book*` and `POST /api/stripe/webhook` (Stripe-signed, but cheap to reject early), and optionally Cloudflare Turnstile on the pay step.
- **Storage bucket policies** (`assets`) live outside the migrations; check in the dashboard that the public bucket does not allow listing (advisor 0025).
- **Rewriting the slot generator set-based.** It is correct and tested; a rewrite is a risk without a measured problem. Revisit with `EXPLAIN` on real data if availability gets slow.
