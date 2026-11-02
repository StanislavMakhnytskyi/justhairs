---
paths:
  - "supabase/migrations/**"
  - "supabase/seed.sql"
  - "supabase/setup.sql"
---

# Migration rules

- `0001–0006` are applied to the live project and **immutable** (a hook blocks edits). `0007`/`0008` are written but not yet applied by the owner — still add the next number (`0009_…sql`) rather than editing them once they are applied. Never rewrite history.
- The user applies migrations; you never run `supabase db push/reset` or paste SQL into a live project. End the work by telling them which file to run and what breaks if they don't.
- Functions: `set search_path = ''` with schema-qualified names, `revoke … from public, anon, authenticated`, then an explicit `grant execute` only to the role that needs it. The booking functions are `service_role`-only (called from server actions); the public key never calls RPCs.
- Grants and RLS are separate layers: revoke by default, grant only the columns/tables the app reads, policies name their role (`to anon, authenticated`) and never call `auth.*` per row.
- Index every foreign key; extensions go in `extensions`, not `public`.
- Tables get RLS; appointments have no anon read (PII). Views read by anon use `security_invoker` where possible.
- Make it re-runnable (`create or replace`, `drop … if exists`, `on conflict`), and note any pre-check the user should run first (e.g. overlapping rows before adding an exclusion constraint).
- Use a distinct SQLSTATE (like `JH409`) for expected business errors so the app switches on `error.code`, not message text.
- Run `npm run test:db` (all migrations + seed on in-memory Postgres; checks grants, search_path, FK indexes, booking behaviour, re-runnability, `database.types.ts`). Update `src/lib/supabase/database.types.ts` for any schema change.
- Have `migration-reviewer` look at it before it is handed over. See `docs/supabase.md`.
- `supabase/setup.sql` is the generated one-shot bundle (all migrations + seed) that the README sends fresh installs to. After adding a migration or changing `seed.sql`, run `npm run db:setup` and commit the result — CI fails (`db:setup:check`) if you forget. Never hand-edit it.
