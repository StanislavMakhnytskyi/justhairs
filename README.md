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

- **Static-first rendering.** Every public page (home, services, service detail, team)
  is prerendered at build time and served from the edge with `revalidate` / ISR — no
  server round-trip, no database hit on the hot path. The booking engine and dashboard
  are dynamic; everything a first-time visitor sees is not.
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
- **Security-first data layer.** Row-Level Security on every table; the booking and
  availability logic lives in `SECURITY DEFINER` Postgres functions that re-check
  everything server-side. The client can't over-book by racing the UI.
- **Honest scoping.** Milestone 1 (the client booking flow) is complete and polished.
  Orders, payments UI, notifications delivery, and the admin panel have their schema in
  place and ship in later milestones behind a clean "coming soon" state — no
  half-finished screens in the demo.

### 🧰 Developer experience

- One `npm install`, one `.env.local`, three SQL files — running locally in minutes.
- Idempotent seed + demo-data scripts, a catalog-sync script for pushing content
  changes to a live DB, and a blur-preview generator. All documented below.
- Deploys to Vercel + hosted Supabase with no custom infrastructure.

---

## What's in this build

Home → Services → 4-step booking (service → specialist → date → time) → auth gate →
review → confirm (pay-later) → confirmation → client dashboard with appointments,
reschedule / cancel, and profile.

Plus: service photography with blur-up loading, a post-visit review loop
(prompt → submit → ratings surfaced on Home / team / service pages), full loading &
error states, dark mode, real map + "open in device maps", and page metadata / OG
images.

Orders, payments UI, favorites, notification delivery, and the admin panel are scoped
for later milestones — tables exist; routes show a "coming soon" state.

## Stack

| Concern       | Choice                                                                             |
| ------------- | --------------------------------------------------------------------------------- |
| Framework     | Next.js 16, App Router, React 19, TypeScript (strict)                            |
| Styling       | Tailwind v4 (`@theme` in `globals.css`) + design tokens in `src/styles/tokens.css` |
| UI components | Local design-system library in `src/components/ui`                               |
| Forms         | react-hook-form + Zod resolvers                                                  |
| Auth + data   | Supabase (Postgres + Row-Level Security + Auth)                                  |
| Payments      | Stripe (webhook verified; checkout in M2)                                        |
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
   - `supabase/seed.sql`

   (Or, with the Supabase CLI linked: `supabase db push` then
   `psql "$DATABASE_URL" -f supabase/seed.sql`.)

   `0002` schedules an hourly `pg_cron` job to mark finished appointments
   `completed`. If `create extension pg_cron` errors, enable **pg_cron** first
   under Database → Extensions, then re-run `0002`.

4. **Auth providers** (Supabase → Authentication → Providers):

   - **Email**: enabled by default. Paste `supabase/email-templates/otp.html` into the
     **Magic Link** and **Confirm signup** templates so sign-in sends a 6-digit code
     rather than a link.
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
   `demo@justhairs.test` (email code) to see the dashboard populated.

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
    services/                    Service list + detail (static / ISR)
    masters/                     Team (static / ISR)
    book/                        4-step booking flow (BookingFlow.tsx) + confirmation
    login/                       Google OAuth + email one-time code
    auth/callback/               OAuth code exchange
    account/                     Protected: dashboard, appointments, profile, stubs
    api/stripe/webhook/          Stripe event handler (signature-verified)
  components/
    ui/                          Design-system component library (Tailwind v4)
    layout/                      AppShell, BottomNav
    marketing/                   Hero, VisitUs, map, footer
    theme/                       Theme script + toggle
  lib/
    supabase/                    Browser / server / middleware clients, types
    actions/                     Zod-validated server actions (booking, profile)
    slot-cache.ts                useSyncExternalStore availability cache
    queries.ts, appointments.ts  Data access
    format.ts, cn.ts, tv.ts      Helpers + design-system utilities
supabase/
  migrations/0001_init.sql       Schema, RLS, booking-engine RPCs
  migrations/0002_reviews_and_cron.sql  Review guard, rating views, pg_cron
  seed.sql                       Demo salon, services, staff, hours
scripts/
  seed-demo.mjs                  Optional: demo customers, past visits, reviews
  sync-catalog.mjs               Push catalog changes to a live DB
  gen-blur.mjs                   Regenerate image blur previews
```

## Booking engine

`get_available_slots(service_id, staff_id, day)` and `book_appointment(...)` are
`SECURITY DEFINER` Postgres functions (in the migration). Slots are generated from each
staff member's `staff_working_hours` for that weekday, minus `staff_time_off` and
existing appointments, stepped by `app_settings.slot_step_min` (15 min). "Any
specialist" collapses to distinct times and a concrete stylist is assigned at booking
time. `book_appointment` re-checks availability inside the transaction to guard against
double-booking — the UI can't race it.

---

### Like what you see?

I build web apps like this for clients — booking systems, storefronts, dashboards,
internal tools. Fast, accessible, type-safe, and handed over with documentation a team
can actually run. Get in touch.
