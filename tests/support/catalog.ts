import { createClient } from "@supabase/supabase-js";

/** Any one active service's slug, read directly from Supabase (anon key) —
 *  used instead of scraping /services, whose list only exists after client
 *  hydration (it sits behind a useSearchParams()-gated Suspense boundary, so
 *  the pre-hydration HTML has no service links to scrape). */
export async function getAnyServiceSlug(): Promise<string> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY not set.");
  }
  const supabase = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data, error } = await supabase
    .from("services")
    .select("slug")
    .eq("active", true)
    .limit(1)
    .single();
  if (error || !data) throw new Error(`Could not read a service slug: ${error?.message}`);
  return data.slug as string;
}
