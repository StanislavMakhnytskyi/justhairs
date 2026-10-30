---
name: visual-check
description: Screenshot the site across widths and themes and have the design-reviewer judge it against docs/design.md. Optional argument: routes to focus on (e.g. "/ /book").
---

1. Locate a running server (the user's dev server is usually `http://localhost:3000`; if none, start the `dev` preview and use the port it reports).
2. Run `npm run shots -- --base <url>` (append `--routes "$ARGUMENTS"` when routes were given). Add a second run with `--reduced` for motion.
3. Hand the result to the `design-reviewer` agent with the base URL and routes; it must open the PNGs in `.shots/`.
4. Summarise its findings: ranked defects with screenshot paths, then what looked right. Offer to hand fixes to `ui-designer`. Do not edit anything yourself.
