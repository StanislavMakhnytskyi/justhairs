// Image assets live in the Supabase Storage "assets" bucket (public, CDN-served).
// See public/ds/CREDITS.md for sources.
import { BLUR } from "./blur.generated";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://vyrgrzmsslcaztkydlng.supabase.co";

export const CDN = `${SUPABASE_URL}/storage/v1/object/public/assets`;

// Hero media is versioned. The bucket serves it with a one-year cache, so a new
// clip gets a new number instead of overwriting the old files. Build all three
// with scripts/prepare-hero.mjs, publish with scripts/upload-hero-video.mjs.
const HERO_VERSION = 2;

/** Frame 0 of the hero video. It is the hero's still while the video loads and
 *  the video's poster, so nothing visibly changes when playback starts. */
export const HERO_POSTER = `${CDN}/hero-${HERO_VERSION}-poster.webp`;

// Background loop for the home hero. Set NEXT_PUBLIC_HERO_VIDEO=1 to play it —
// without the flag the hero is just the poster frame.
export const HERO_VIDEO =
  process.env.NEXT_PUBLIC_HERO_VIDEO === "1"
    ? { mp4: `${CDN}/hero-${HERO_VERSION}.mp4`, webm: `${CDN}/hero-${HERO_VERSION}.webm` }
    : null;

/**
 * The generated blur preview for a storage URL, or undefined if we don't have
 * one (an image added after the last `scripts/gen-blur.mjs` run).
 */
export function blurFor(url?: string | null): string | undefined {
  if (!url) return undefined;
  const path = url.split("/storage/v1/object/public/assets/")[1];
  return path ? BLUR[path] : undefined;
}
