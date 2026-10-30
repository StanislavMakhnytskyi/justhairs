# Image credits

Two kinds of picture on the site:

- **Service pictures are original artwork.** Each service is a flat-lay of the tools it
  uses on the same navy dotted mat as the hero footage, drawn in code
  (`scripts/draw-service-images.mjs`) and committed as `public/images/services/<slug>.webp`
  with their blur placeholders in `src/lib/service-images.generated.ts`. Nothing to
  credit or license. The catalog layer (`src/lib/queries.ts`) serves them in place of the
  `photo_url` stored in the database, so the old bucket files
  (`assets/services/*.webp`, Unsplash photos) are no longer used.
- **Team portraits are photos** from [Unsplash](https://unsplash.com) under the
  [Unsplash License](https://unsplash.com/license) (free, commercial use allowed, no
  attribution required), resized and re-encoded to WebP, served from the Supabase Storage
  `assets` bucket (public, CDN) — not committed to this repo.

## Hero video (`assets/hero-2.mp4`, `assets/hero-2.webm`, `assets/hero-2-poster.webp`)

"Barber equipment" from [Mixkit](https://mixkit.co/free-stock-video/barber-equipment-271/)
(clip 271, 1080p, 24 fps), used under the Mixkit Stock Video Free License (commercial
or personal use, per the clip's page — read the licence at
https://mixkit.co/license/#videoFree before relying on it). First 7 s, scaled to 720p,
silent, played forward then in reverse so the slider move loops without a seam.
Built with `scripts/prepare-hero.mjs`; the poster is frame 0 of the encoded video, so
the still shown while the video loads is the same picture the video starts on. Files
are versioned (`HERO_VERSION` in `src/lib/assets.ts`) because the bucket is cached for
a year; publish with `scripts/upload-hero-video.mjs --version 2`, then run
`scripts/gen-blur.mjs`. The video plays only with `NEXT_PUBLIC_HERO_VIDEO=1`; without
it the hero is the poster frame.

The previous clip ("Hairdresser's tools" from
[Coverr](https://coverr.co/videos/hairdressers-tools-px2xmoqn61), royalty-free for
commercial use, no attribution required) is `assets/hero.mp4` / `hero.webm`, and
`assets/hero.webp` (Unsplash `photo-1521590832167-7bcbfaa6381f`) is its old still; neither is referenced any more.
