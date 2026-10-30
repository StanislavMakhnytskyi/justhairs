---
paths:
  - "src/components/**"
  - "src/app/**/*.tsx"
---

# UI code rules

- Read `docs/design.md` first. Reuse the shape utilities (`.cut`, `.ticket-hero`, `.scallop-*`, `rounded-tile`) and components (`BookShell`, `TicketPanel`, `HomeNav`, `Reveal`, `Button`, `RowShell`) instead of re-inventing them.
- Type: named steps only (`text-display`, `text-label`, …). Raw `text-[Npx]` is blocked by a hook.
- Colour/spacing: semantic tokens (`bg-surface-card`, `text-text-secondary`, `px-gutter`). No hex, no `neutral-*` for muted copy (the AA-tuned `text-secondary/tertiary` exist for a reason).
- Variants: `import { tv } from "@/lib/tv"` — not `tailwind-variants`. `cn()` is clsx, not tailwind-merge: don't pass conflicting utilities and expect a winner.
- Motion: always `motion-safe:`; entrances use `backwards` fill only; scroll-ins go through `Reveal`; nothing may stay invisible if JS or animation doesn't run.
- `SmoothImage` stays stateless/server-renderable (an `onLoad`+opacity version once left images invisible when hydration was slow).
- Accessibility: keep `radiogroup`/`radio` for date/time, `aria-current="step"`, 44px targets, visible focus, `aria-hidden` on decoration, `role="alert"` on error text.
- Client components only when needed (`"use client"`); keep data fetching in server components / `src/lib/queries.ts`.
- Anchors that the floating nav targets need `scroll-mt-24`.
