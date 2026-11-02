import { createPublicClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { Rating } from "@/lib/supabase/types";

export type LatestReview = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer: string;
  service_name: string | null;
  staff_name: string | null;
};

export async function getLatestReviews(limit = 3): Promise<LatestReview[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await createPublicClient()
      .from("public_reviews")
      .select("id, rating, comment, created_at, reviewer_first, service_name, staff_name")
      .not("comment", "is", null)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    // View columns are all nullable in the generated types; drop any row that
    // can't be shown rather than render a half-empty slip.
    return (data ?? []).flatMap((r) =>
      r.id && r.rating !== null && r.created_at
        ? [
            {
              id: r.id,
              rating: r.rating,
              comment: r.comment,
              created_at: r.created_at,
              reviewer: r.reviewer_first?.trim() || "A client",
              service_name: r.service_name,
              staff_name: r.staff_name,
            },
          ]
        : [],
    );
  } catch (e) {
    console.error("[supabase] getLatestReviews failed:", e);
    return [];
  }
}

/** The salon-wide score: one aggregate row from the `overall_rating` view. */
export async function getOverallRating(): Promise<Rating | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = createPublicClient();
  try {
    const { data, error } = await supabase.from("overall_rating").select("rating, review_count").maybeSingle();
    if (error) throw new Error(error.message);
    if (!data || !data.review_count || data.rating === null) return null;
    return { rating: Number(data.rating), review_count: data.review_count };
  } catch (e) {
    // The view arrives with migration 0007. Until it is applied, fall back to
    // averaging the (display-column-only) review ratings here.
    console.warn("[supabase] overall_rating unavailable, averaging in Node:", e);
    try {
      const { data } = await supabase.from("reviews").select("rating");
      if (!data || data.length === 0) return null;
      const sum = data.reduce((a, r) => a + r.rating, 0);
      return { rating: Math.round((sum / data.length) * 10) / 10, review_count: data.length };
    } catch {
      return null;
    }
  }
}

export async function getRatingsMap(
  view: "service_ratings" | "staff_ratings",
): Promise<Record<string, Rating>> {
  if (!isSupabaseConfigured) return {};
  try {
    const supabase = createPublicClient();
    const res =
      view === "service_ratings"
        ? await supabase.from("service_ratings").select("service_id, rating, review_count")
        : await supabase.from("staff_ratings").select("staff_id, rating, review_count");
    if (res.error) throw new Error(res.error.message);

    const out: Record<string, Rating> = {};
    for (const r of res.data ?? []) {
      const id = "service_id" in r ? r.service_id : r.staff_id;
      if (id && r.rating !== null && r.review_count !== null) {
        out[id] = { rating: Number(r.rating), review_count: r.review_count };
      }
    }
    return out;
  } catch (e) {
    console.error(`[supabase] getRatingsMap(${view}) failed:`, e);
    return {};
  }
}
