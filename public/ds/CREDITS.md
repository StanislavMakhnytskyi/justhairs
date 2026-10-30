# Image credits

All service and team photographs are free stock from [Pexels](https://www.pexels.com)
under the [Pexels License](https://www.pexels.com/license/) (free for commercial use, no
attribution required — credited here anyway). Each is cropped to a common shape and given
one mild colour grade (`scripts/prepare-photos.mjs`, ids in `scripts/photos.json`), then
committed in `public/images/{services,staff}/` with a content hash in the filename. The
catalog layer (`src/lib/queries.ts`) serves them in place of the `photo_url` stored in the
database, so the old Unsplash files in the Supabase bucket (`assets/services/*.webp`,
`assets/staff/*.webp`) are no longer used.

Pexels asks that identifiable people are not shown in a bad light or as endorsing a
product; these are ordinary salon and barbershop scenes. Photographer names are listed
where known; the rest are on each photo's Pexels page.

## Services (`public/images/services/`)

| Slug | Pexels photo | Photographer |
| --- | --- | --- |
| `mens-haircut` | [17784004](https://www.pexels.com/photo/17784004/) | — |
| `mens-haircut-beard` | [4625615](https://www.pexels.com/photo/4625615/) | — |
| `mens-beard` | [3998421](https://www.pexels.com/photo/3998421/) | — |
| `mens-shaving` | [6007400](https://www.pexels.com/photo/6007400/) | alexandre saraiva carniato |
| `mens-styling` | [4952618](https://www.pexels.com/photo/4952618/) | — |
| `womens-haircut` | [8467965](https://www.pexels.com/photo/8467965/) | — |
| `womens-coloring` | [2799605](https://www.pexels.com/photo/2799605/) | — |
| `womens-highlights` | [8468126](https://www.pexels.com/photo/8468126/) | — |
| `womens-blow-dry` | [10028673](https://www.pexels.com/photo/10028673/) | — |
| `womens-styling` | [3065171](https://www.pexels.com/photo/3065171/) | Engin Akyurt |
| `womens-treatment` | [7755502](https://www.pexels.com/photo/7755502/) | — |

## Team (`public/images/staff/`)

These are stock portraits of barbers and stylists standing in for the demo team; the names
on the site are fictional.

| Slug | Pexels photo | Photographer |
| --- | --- | --- |
| `ben-carter` | [18483774](https://www.pexels.com/photo/18483774/) | — |
| `devon-cole` | [7697489](https://www.pexels.com/photo/7697489/) | — |
| `marco-ferreira` | [3423308](https://www.pexels.com/photo/3423308/) | — |
| `amara-lee` | [8834019](https://www.pexels.com/photo/8834019/) | — |
| `priya-shah` | [3992860](https://www.pexels.com/photo/3992860/) | cottonbro studio |
| `nadia-hassan` | [33867529](https://www.pexels.com/photo/33867529/) | Daniel & Hannah Snipes |
| `yuki-tanaka` | [9709014](https://www.pexels.com/photo/9709014/) | Kamil Rybarski |

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
