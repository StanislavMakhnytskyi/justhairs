---
name: ship
description: Run the pre-PR checks, review, commit, push and open a PR for the current branch — stopping before merge. Use when the user says ship it / open a PR / commit and push.
disable-model-invocation: true
---

Ship the current branch. Stop and report at the first failing step; do not paper over failures.

1. **Branch**: if on `main`, create a branch (`feat/…`, `fix/…`, `chore/…`) first. Never commit to `main`.
2. **Checks**: `npm run check` then `npm run build`. Fix real failures.
3. **Flow**: find the running dev server (user's is usually :3000; otherwise ask or start a preview on a free port) and run the `flow-tester` agent. It is read-only and never confirms a booking. Skip only if no UI/booking code changed, and say so.
4. **Reviews**: run `code-reviewer` on `git diff main...HEAD`. If UI changed, also `design-reviewer`; if `supabase/migrations` changed, also `migration-reviewer`. Fix High findings, or list them in the PR body as known.
5. **Commit**: stage explicit paths (no `git add -A` of unrelated files), imperative subject, body with the *why*. **No Claude/Anthropic attribution anywhere in the message.**
6. **Push + PR** (confirm with the user first — these are outward-facing): `git push -u origin <branch>`, then `gh pr create --base main` with:
   - Summary (what changed and why)
   - Test plan with checkboxes: what ran (check, build, flow-check, smoke) and, explicitly, what was **not** exercised (live confirm/pay, Stripe, real devices, migrations not yet applied)
   - End the body with the attribution line configured for this session if one is given.
7. Report the PR URL and CI status. **Do not merge** unless the user explicitly asks in a separate message; if the PR touches a migration, remind them it must be applied before/with the deploy.
