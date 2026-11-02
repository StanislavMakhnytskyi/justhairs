# justhairs design system (as built)

The site is a **printed appointment card**: paper on a brand-coloured band, cut with perforations, stamped when it's done. Home and booking share the one vocabulary. This file is the contract the design agents (`ui-designer`, `design-reviewer`) build and check against — keep it in step with the code.

Tokens live in `src/styles/tokens.css` (colour, shadow, radius, spacing) and `src/app/globals.css` (`@theme` type scale, motion, and the shape utilities below). Never hard-code colours or pixel sizes.

## Vocabulary

| Piece | Where | What it is |
| --- | --- | --- |
| **Band** | `.book-band` | Brand-purple page with a faint two-corner gradient mesh. Home bands are `bg-brand` tiles. |
| **Paper** | `bg-surface-card` | The white (dark-theme: card) sheet everything sits on. |
| **Cut** | `.cut` | Dotted perforation with a half-disc bitten from each edge. Discs are band-coloured, so a cut works anywhere in the card (and rides with the sticky stub). |
| **Hero ticket** | `.ticket-hero` | Desktop only (`lg`): masked paper ticket on the video, perforation + top/bottom punches. On a phone there is no ticket over the video — see *Phone hero* below. |
| **Scallop** | `.scallop-y`, `.scallop-top` | Scalloped edges: the price sheet, the back-of-card footer. |
| **Torn slip** | `ReviewSlips` | `clip-path` zigzag; shadow lives on a *parent* (`drop-shadow`) because clip-path clips its own shadow. |
| **Tile** | `rounded-tile` (28px) | Rounded bento panel, desktop (`lg`) only; mobile sections stay full-bleed bands. |
| **Eyebrow** | `01 — Services` … `04 — Visit` | Numbered label above section titles; echoes the booking step numbers. |
| **Stub** | `StickyBar` | Bottom of a booking card: perforation + detail (price) + the one action. |
| **Stamp** | `animate-stamp` | Confirmation seal. |

## Layout

- **Mobile (<1024px)**: single column, full-bleed bands, no floating nav. Booking = card on the band, 12px margin.
  - **Phone hero**: one tall card on the brand band. The footage fills all of it; the headline, sentence and button sit *on* the footage over a neutral scrim (white text ≥ 4.5:1 across the whole loop — re-measure if the clip or scrim changes), the rating chip top-left opposite the pause button. The only paper is the tear-off stub at the foot (address + today's hours) with a scalloped top edge (`scallop-top`, `--r: 9px`) that bites into the footage. Do not stack a paper block under the video or draw a half perforation across it — that read as two blocks with a seam.
- **Desktop (≥1024px)**:
  - `HomeNav` — floating frosted pill (`fixed top-4`), condenses to a solid-ish pill after the hero, scroll-spy highlights the section. `variant="book"` swaps the section links for Home/Services/Team.
  - Home = inset rounded hero (`lg:m-4 rounded-tile`), then rounded tiles 16px apart on a `surface-sunken` page: services (purple tile + photo + scalloped sheet), team (bento: 2×2 feature + singles + 2-wide CTA), reviews (purple tile, loose slips at different heights), visit (map tile + Hours / Find us / Book tiles), reply card, back-of-card footer.
  - `/book` = `BookShell` with the `TicketPanel` (live "Your ticket") on the left and the step card on the right. Other booking pages keep one centred card (40rem).
- Anchors need `scroll-mt-24` (the nav floats).

## Photography

Every service and every team member has **a real photograph of a master at work**, from free stock (Pexels, credited in `public/ds/CREDITS.md`) — never generated or illustrated imagery. The set reads as one because of how it is chosen and finished, not because the originals match:

- **Subject**: a close or medium shot of a barber or stylist actually performing *that* service — shears on the ends for a women's cut, a hot towel and razor for shaving, a brush on foil for highlights, a round brush and dryer for a blow-dry, curls pinned for event styling, a treatment cap for treatment. Hands and tools are the subject; faces are optional. One service, one photo — never share a picture between services, and no mask-era or third-party-branded shots.
- **Team**: a portrait of a barber or stylist in their own shop, head and shoulders, looking at or near the camera; barbers for the barbers, stylists for the stylists.
- **Finish**: `scripts/prepare-photos.mjs` crops each to 4:3 (services; shown at 16:9, 4:5 and 1:1) or 4:5 (team) around a chosen focus and applies the *same* grade to all — slightly desaturated, a touch more contrast, shadows pulled toward the site's navy. Do not hand-edit a photo; change its entry in `scripts/photos.json` (Pexels id, `focus`, `zoom`) and re-run.
- **Output**: `public/images/{services,staff}/<slug>.<hash>.webp` plus `src/lib/photos.generated.ts` (blur placeholders) — commit both. The hash in the filename means a changed photo is a new URL, so no cache can serve the old one.
- The catalog layer serves these in place of the database's `photo_url`; slugs without a photo keep their stored URL.
- To add a service or stylist: pick a Pexels photo that meets the subject rule, add it to `photos.json`, run the script, check it at 16:9 / 4:5 / 1:1 and credit it in `CREDITS.md`.

## Type scale

Named steps only — `text-hero 56 / display 32 / title 23 / heading 18 / subhead 16 / body 15 / label 13 / caption 12`. **No `text-[Npx]`** in `src/components` or `src/app` (a hook enforces it; `Logo`'s wordmark is the single exception). Section titles use `text-display lg:text-hero`. Import `tv` from `src/lib/tv.ts`, not `tailwind-variants` (tailwind-merge otherwise eats custom `text-*` steps); `cn()` is plain clsx.

## Motion

- Tokens in `@theme`: `animate-rise` (+ `.stagger` with `--i`), `animate-print` (ticket off the printer), `animate-stamp`, `animate-settle`, `animate-pill-in`, `animate-fade-in(-up)`, sheet/scrim.
- `Reveal` (`components/ui/Reveal.tsx`) for scroll-in: content is visible by default and only hidden once the client knows it is below the fold.
- **Rules**: every animation is `motion-safe:`; **no `animation-fill-mode: both/forwards` on entrances** (a frozen tab would pin the first frame at opacity 0 — `backwards` only, for stagger delays); the single `prefers-reduced-motion` block at the end of `globals.css` must keep covering new keyframes; nothing may be invisible without JS.
- **Hero poster = video frame 0.** The still behind the hero video, the `<video poster>` and the blur placeholder are all the first frame of the encoded clip (`scripts/prepare-hero.mjs`), so the video takes over invisibly. Never use an unrelated photo as the hero still, and version new media (`HERO_VERSION`) rather than overwriting — the bucket is cached for a year.
- **Loading states must not blink.** A skeleton is built to the real component's measurements (same shell, side panel, row heights — compare their boxes, don't eyeball), and whatever replaces it must not re-run an entrance animation: `BookShell` has none, `TicketPanel` has none, and the booking step body fades only when the step *changes*, never on first load (it would start at opacity 0 the moment the skeleton goes). Entrance animations belong on things that appear once, like the hero ticket.
- Page transitions: **no root `<ViewTransition>`** — quick taps aborted it ("Transition was aborted") and surfaced as an unhandled rejection. Pages animate themselves.

## Colour, themes, surfaces

Use semantic tokens: `surface-app / card / sunken`, `text-primary / secondary / tertiary`, `border-default / strong`, `brand*`. Dark theme flips via `[data-theme="dark"]`; paper stays `surface-card`. Photo tiles pin dark text (`--neutral-900`) so they read identically in both themes. Glass surfaces (`backdrop-blur` + translucent fill) must keep text ≥ 4.5:1 — add a dark tint under white text on video.

## Interaction & a11y

- Targets ≥ 44px (back button, slot cells). Visible focus ring everywhere (`focus-visible:outline-2 outline-brand`).
- Booking semantics are load-bearing for tests: `radiogroup`/`radio` for dates and times (`Choose a date`, `Choose a time`), `Back`, `Back to <step>` buttons, `aria-current="step"`, `Any specialist`, `Confirm booking`.
- Selectable rows are printed lines (dotted rule, tint when selected + brand check) — no boxed cards in lists.
- Decorative bits (`.cut`, dotted leaders, perforation) are `aria-hidden`.

## Checklist for a design review

1. Same vocabulary on home *and* every booking step (band, paper, cut, stub, eyebrows).
2. 390 / 768 / 1024 / 1440 / 1920, light + dark, reduced motion — nothing hidden, no overlap (check hero chips vs pause button, nav vs content).
3. Type scale + tokens only; no raw px/hex.
4. Motion present on load and on scroll, but only under `motion-safe`.
5. Contrast on glass/photo surfaces; 44px targets; focus rings.
6. Empty/edge states: no photo, one stylist, fully booked day, error boundary.
