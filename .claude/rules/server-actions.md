---
paths:
  - "src/lib/**"
---

# Server-side code rules

- Every server action validates its input with Zod before touching the database. Ids use `z.guid()`; `z.uuid()` rejects the seeded staff ids.
- Timestamps from Postgres (`+00:00`, microseconds) are not valid for Zod's strict `.datetime()` — parse with `Date.parse` and re-serialise with `toISOString()` before an RPC.
- `createAdminClient()` (service role) is server-only and used for everything private: the booking RPCs (`book_appointment`, `get_available_slots`, `get_day_availability`) and `appointments` (PII). `createPublicClient()` only reads the public catalog and rating views. Both clients are typed with `Database` — no `as` casts on query results.
- Never call a server action in a loop or `Promise.all` fan-out: Next serialises action requests, so the last one waits for all the others. Batch into one RPC (see `get_day_availability`).
- Contract: actions return `ActionResult`; the availability readers intentionally **throw** (so "empty" and "broken" differ) — callers must catch (`slot-cache.ts` does).
- Known gaps are tracked in `CODE_REVIEW.md` with inline `KNOWN ISSUE (#N)` markers; fix the entry and the marker together.
- Payment: the Stripe webhook (`/api/stripe/webhook`, signature on the raw body) is the source of truth; `reconcileCheckout` on the confirmation page is the fast path. Both go through the `record_payment` RPC (row-locked, idempotent, checks session id + amount) — keep it that way.
- Every booking mutation and the pay/confirmation pages require the per-booking `hold_token` cookie (`src/lib/hold-token.ts`); never accept a bare appointment id as proof of ownership.
