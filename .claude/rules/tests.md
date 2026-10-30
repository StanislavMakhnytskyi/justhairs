---
paths:
  - "tests/**"
  - "scripts/**"
  - "playwright.config.ts"
---

# Test and script rules

- Playwright targets a **deployed** site (`TEST_PROD_URL` / `TEST_PREVIEW_URL`) or `PLAYWRIGHT_BASE_URL`; locally pass the dev server's real port.
- `tests/smoke` and `scripts/shots.mjs` / `scripts/flow-check.mjs` are **read-only** — nothing may reach "Confirm booking". Only `tests/e2e` books, tags the email `e2e+<ts>@justhairs.test`, and deletes its own row afterwards; it needs the user's go-ahead (live DB).
- Hydration race: a click right after `page.goto()` can land before React attaches the handler. Click, then assert the next state, and retry (`clickUntil` in `tests/support/slots.ts` / `scripts/_pw.mjs`). Rapid back-to-back clicks must wait for the URL to change.
- Select by role/name, not styling hooks (`getByRole("button", { name: /€\d/ })` = a service row; `Any specialist`; `radiogroup` "Choose a date"/"Choose a time").
- Test-only flows must pick whatever day/slot the live catalog has; never hard-code a date.
- A cold dev server compiles routes on first hit, so the first parallel run can time out — rerun before assuming a regression.
