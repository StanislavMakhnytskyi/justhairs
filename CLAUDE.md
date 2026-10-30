@AGENTS.md

# justhairs — project guide

Guest booking flow for a unisex hair salon (Next.js 16 App Router, React 19, TypeScript strict, Tailwind v4, Supabase, Stripe test mode). Portfolio project; English; EUR; salon timezone Europe/Dublin. Do not edit `AGENTS.md` (Next rewrites it) — project guidance goes here.

## Commands

| | |
| --- | --- |
| `npm run dev` | dev server — port 3000 may be taken by the user's own server; use the port the preview tool reports |
| `npm run check` | `lint` + `typecheck` (run before every commit) |
| `npm run build` | production build |
| `npm run shots -- --base <url>` | screenshot matrix → `.shots/` (read-only) |
| `npm run check:flow -- --base <url>` | read-only booking-flow walk that reports runtime errors; **never confirms a booking** |
| `npm run db:setup` | regenerate `supabase/setup.sql` (migrations + seed in one file); `db:setup:check` is the CI gate |
| `npm run test:smoke` | read-only Playwright smoke tests (targets a deployed URL or `PLAYWRIGHT_BASE_URL`) |

## Where things are

`src/app` routes (`/`, `/services`, `/services/[slug]`, `/book`, `/book/pay/[id]`, `/book/confirmation/[id]`) · `src/components/{home,marketing,ticket,ui,layout}` · `src/lib/actions/booking.ts` (server actions) · `src/lib/slot-cache.ts` (client availability cache) · `supabase/migrations` · `tests/{smoke,e2e}` · `docs/design.md` (design system) · `CODE_REVIEW.md` (known issues, numbered).

## Non-negotiables

1. **The Supabase project is shared and live.** Never click "Confirm booking", run `test:e2e`, `scripts/seed-demo.mjs`, `scripts/sync-catalog.mjs`, or apply a migration without asking first. Migrations `0001–0006` are applied and immutable; changes go in a new numbered file that the user applies, then `npm run db:setup` regenerates the generated bundle `supabase/setup.sql` (fresh installs; never hand-edit).
2. **Design**: follow `docs/design.md`. Named type steps only (no `text-[Npx]`), semantic tokens only, import `tv` from `src/lib/tv.ts`, every animation `motion-safe`, no `animation-fill-mode: both`, no root `ViewTransition`.
3. **Server actions** (`src/lib/actions`): Zod-validate every input, ids with `z.guid()` (not `z.uuid()` — seeded ids fail it), service-role client stays server-side, never fan out server actions in a loop (Next serialises them).
4. **Booking state lives in the URL** (`?service&staff&date&time&step`); `BookingFlow` derives the step with a fallback — keep it that way, and keep the roles/labels the tests rely on (see `docs/design.md`).
5. **Commits**: no Claude/Anthropic attribution anywhere in commit messages.

## Workflow

- Build UI with the `ui-designer` agent; check it with `design-reviewer` (or `/visual-check`).
- Before a PR: `npm run check`, `npm run build`, `flow-tester`, `code-reviewer`. `/ship` does all of it and stops before merging.
- New SQL → `migration-reviewer`. Fixing a `KNOWN ISSUE (CODE_REVIEW.md #N)` → update that entry and the inline marker.
- Say honestly what was *not* exercised (live confirm/pay, Stripe checkout, real devices).
- Path-scoped rules live in `.claude/rules/`; hooks in `.claude/hooks/` (lint on edit, guards, typecheck on stop).

## Agent orchestration

Opus plans first, verifies last, and never touches raw project files.

For every development task:

1. Opus defines the implementation plan.
2. Delegate all file discovery and codebase exploration to the `researcher` (Haiku, read-only: Read/Glob/Grep).
3. Delegate all code modifications and test execution to the `coder` (Sonnet).
4. Opus reviews the implementation and test results.
5. Opus reports the final outcome.

Opus must not directly read, search, create, edit or delete project source files.

If verification reveals problems, delegate corrections to Sonnet and repeat verification.

Notes for this repo:
- This is an instruction to the model, not a technical lock; only the `researcher`'s tool list is enforced by configuration.
- UI work goes to `ui-designer` (the `coder` specialised for the design system) instead of `coder`; verification can use the reviewer agents (`code-reviewer`, `design-reviewer`, `flow-tester`, `migration-reviewer`), which Opus invokes rather than reading files itself.
- The `coder` is bound by the Non-negotiables above, in particular the shared live database.
