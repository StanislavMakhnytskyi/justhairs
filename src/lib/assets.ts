// Image assets live in the Supabase Storage "assets" bucket (public, CDN-served).
// See public/ds/CREDITS.md for sources.
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://vyrgrzmsslcaztkydlng.supabase.co";

export const CDN = `${SUPABASE_URL}/storage/v1/object/public/assets`;

export const HERO_IMAGE = `${CDN}/hero.webp`;

// Tiny blurred placeholder for the hero (LCP image).
export const HERO_BLUR =
  "data:image/webp;base64,UklGRkgAAABXRUJQVlA4IDwAAADQAQCdASoQAAoABUB8JZwAApQkEDLygAD+6CPsCo/camU7VOrXY/C3NMZIcERGe+P0SLx+AIP5FB5FAAA=";
