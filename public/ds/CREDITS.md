# Image credits

All photos are from [Unsplash](https://unsplash.com) under the
[Unsplash License](https://unsplash.com/license) (free, commercial use allowed,
no attribution required). They are resized, cropped and re-encoded to WebP, then
served from the Supabase Storage `assets` bucket (public, CDN) — not committed to
this repo. Re-upload with `scripts/` if the bucket is recreated.

## Services (`assets/services/*.webp`)

| Slug | Unsplash photo ID |
| --- | --- |
| `mens-haircut`, `mens-haircut-beard` | `photo-1599351431202-1e0f0137899a` |
| `mens-beard`, `mens-shaving` | `photo-1503951914875-452162b0f3f1` |
| `mens-styling` | `photo-1552642986-ccb41e7059e7` |
| `womens-haircut` | `photo-1519699047748-de8e457a634e` |
| `womens-coloring`, `womens-highlights` | `photo-1470259078422-826894b933aa` |
| `womens-blow-dry` | `photo-1562322140-8baeececf3df` |
| `womens-styling` | `photo-1580618672591-eb180b1a973f` |
| `womens-treatment` | `photo-1595476108010-b4d1f102b1b1` |
| `hero` | `photo-1521590832167-7bcbfaa6381f` |

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
`assets/hero.webp` is its old still; neither is referenced any more.
