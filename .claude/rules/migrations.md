---
paths:
  - "supabase/migrations/**"
  - "supabase/seed.sql"
---

# Migration rules

- `0001–0006` are applied to the live project and **immutable** (a hook blocks edits). Add the next number (`0007_…sql`); never rewrite history.
- The user applies migrations; you never run `supabase db push/reset` or paste SQL into a live project. End the work by telling them which file to run and what breaks if they don't.
- Functions called by the anon role: `security definer` + `set search_path = public`, `revoke … from public`, then an explicit `grant execute … to anon` only where intended.
- Tables get RLS; appointments have no anon read (PII). Views read by anon use `security_invoker` where possible.
- Make it re-runnable (`create or replace`, `drop … if exists`, `on conflict`), and note any pre-check the user should run first (e.g. overlapping rows before adding an exclusion constraint).
- Use a distinct SQLSTATE (like `JH409`) for expected business errors so the app switches on `error.code`, not message text.
- Have `migration-reviewer` look at it before it is handed over.
