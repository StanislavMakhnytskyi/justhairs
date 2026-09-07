// Image assets live in the Supabase Storage "assets" bucket (public, CDN-served).
// See public/ds/CREDITS.md for sources.
import { BLUR } from "./blur.generated";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://vyrgrzmsslcaztkydlng.supabase.co";

export const CDN = `${SUPABASE_URL}/storage/v1/object/public/assets`;

export const HERO_IMAGE = `${CDN}/hero.webp`;

/**
 * The generated blur preview for a storage URL, or undefined if we don't have
 * one (an image added after the last `scripts/gen-blur.mjs` run).
 */
export function blurFor(url?: string | null): string | undefined {
  if (!url) return undefined;
  const path = url.split("/storage/v1/object/public/assets/")[1];
  return path ? BLUR[path] : undefined;
}
