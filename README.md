# justhairs

A mobile-first booking product for a unisex hair salon — built as a small booking SaaS,
not a brochure site. Next.js (App Router) + React 19 + Tailwind v4 + Supabase + Stripe.

**Milestone 1 + polish (this build):** the client booking flow.
Home → Services → 4-step booking (service → specialist → date → time) → auth gate →
review → confirm (pay-later) → confirmation → client dashboard with appointments,
reschedule / cancel, and profile. Plus: service photography, a post-visit review loop
(prompt → submit → ratings on Home / team / service pages), loading & error states,
dark mode, and page metadata.

Orders, payments UI, favorites, notifications delivery and the admin panel are scoped
for later milestones. Their tables exist in the schema; the routes show a
"coming soon" state.

## Stack

| Concern        | Choice                                             |
| -------------- | -------------------------------------------------- |
| Framework      | Next.js 16, App Router, React 19, TypeScript       |
| Styling        | Tailwind v4 (`@theme` in `globals.css`) + design tokens in `src/styles/tokens.css` |
| UI components  | Local library in `src/components/ui`, rebuilt from the Beauty Booking design system |
| Auth + data    | Supabase (Postgres + RLS + Auth)                   |
| Payments       | Stripe test mode (scaffold only in M1)             |
| Hosting        | Vercel + hosted Supabase                           |

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
   - `supabase/seed.sql`

   (Or, with the Supabase CLI linked: `supabase db push` then
   `psql "$DATABASE_URL" -f supabase/seed.sql`.)

   `0002` schedules an hourly `pg_cron` job to mark finished appointments
   `completed`. If `create extension pg_cron` errors, enable **pg_cron** first
   under Database → Extensions, then re-run `0002`.

4. **Auth providers** (Supabase → Authentication → Providers):

   - **Email**: enabled by default — magic links work out of the box.
   - **Google**: enable it, create a Web OAuth client in Google Cloud Console,
     add `https://<project-ref>.supabase.co/auth/v1/callback` as an authorized
     redirect URI, paste the client ID/secret into Supabase, and add
     `http://localhost:3000/**` + your Vercel URL to Authentication → URL
     Configuration → Redirect URLs.

5. **Demo data** (optional — past visits + reviews so the UI has real content):

   ```bash
   node --env-file=.env.local scripts/seed-demo.mjs
   ```

   Creates a handful of demo customers (`demo@justhairs.test` and friends) with
   completed appointments and reviews. Idempotent — safe to re-run. Sign in as
   `demo@justhairs.test` via the email magic link to see the dashboard populated.

6. **Regenerate DB types** (optional but recommended once the schema is live):

   ```bash
   npx supabase gen types typescript --project-id <ref> > src/lib/supabase/types.gen.ts
   ```

   The app currently uses hand-authored domain types in `src/lib/supabase/types.ts`.

7. **Run**

   ```bash
   npm run dev
   ```

   Make yourself an admin (for later milestones): sign in once, then in the SQL editor
   `update profiles set role = 'admin' where email = 'you@example.com';`

## Stripe (M1 scaffold)

Set `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` and forward events while developing:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

The webhook route verifies signatures and logs events. Checkout sessions and the
pay-now / pay-later order flow arrive in Milestone 2.

## Deployment (Vercel)

1. Push to GitHub, import the repo in Vercel.
2. Add every variable from `.env.example` in the Vercel project settings, with
   `NEXT_PUBLIC_SITE_URL` set to the deployed URL.
3. Add `https://<your-domain>/auth/callback` to Supabase Auth redirect URLs and to the
   Google OAuth client.

## Project layout

```
src/
  app/
    page.tsx                     Home
    services/                    Service list + detail
    masters/                     Team
    book/                        4-step booking flow (BookingFlow.tsx) + confirmation
    login/                       Google OAuth + email magic link
    auth/callback/               OAuth + magic-link code exchange
    account/                     Protected: dashboard, appointments, profile, stubs
    api/stripe/webhook/          Stripe event handler (skeleton)
  components/
    ui/                          Design-system component library (Tailwind)
    layout/                      AppShell, BottomNav
    marketing/                   Hero
    theme/                       Theme script + toggle
  lib/
    supabase/                    Browser / server / middleware clients, types
    actions/                     Server actions (booking, profile)
    queries.ts, appointments.ts  Data access
    format.ts, cn.ts             Helpers
supabase/
  migrations/0001_init.sql       Schema, RLS, booking-engine RPCs
  migrations/0002_reviews_and_cron.sql  Review guard, rating views, pg_cron
  seed.sql                       Demo salon, services, staff, hours
scripts/seed-demo.mjs            Optional: demo customers, past visits, reviews
```

## Booking engine

`get_available_slots(service_id, staff_id, day)` and `book_appointment(...)` are
`SECURITY DEFINER` Postgres functions (in the migration). Slots are generated from each
staff member's `staff_working_hours` for that weekday, minus `staff_time_off` and
existing appointments, stepped by `app_settings.slot_step_min` (15 min). "Any
specialist" collapses to distinct times and a concrete stylist is assigned at booking
time. `book_appointment` re-checks availability to guard against double-booking.
