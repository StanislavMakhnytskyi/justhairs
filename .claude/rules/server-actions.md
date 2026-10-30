---
paths:
  - "src/lib/**"
---

# Server-side code rules

- Every server action validates its input with Zod before touching the database. Ids use `z.guid()`; `z.uuid()` rejects the seeded staff ids.
- Timestamps from Postgres (`+00:00`, microseconds) are not valid for Zod's strict `.datetime()` — parse with `Date.parse` and re-serialise with `toISOString()` before an RPC.
- `createAdminClient()` (service role) is server-only and only for rows anon cannot read (appointments carry PII). Public data uses `createPublicClient()`.
- Never call a server action in a loop or `Promise.all` fan-out: Next serialises action requests, so the last one waits for all the others. Batch into one RPC (see `get_day_availability`).
- Contract: actions return `ActionResult`; the availability readers intentionally **throw** (so "empty" and "broken" differ) — callers must catch (`slot-cache.ts` does).
- Known gaps are tracked in `CODE_REVIEW.md` with inline `KNOWN ISSUE (#N)` markers; fix the entry and the marker together.
- Payment: no webhook. Confirmation reconciles via `reconcileCheckout`; keep it idempotent.
