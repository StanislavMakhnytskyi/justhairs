import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
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
    const supabase = await createClient();
    const { data } = await supabase
      .from("public_reviews")
      .select("id, rating, comment, created_at, reviewer_first, service_name, staff_name")
      .not("comment", "is", null)
      .order("created_at", { ascending: false })
      .limit(limit);
    return (data ?? []).map((r: Record<string, unknown>) => ({
      id: r.id as string,
      rating: r.rating as number,
      comment: r.comment as string | null,
      created_at: r.created_at as string,
      reviewer: (r.reviewer_first as string | null)?.trim() || "A client",
      service_name: (r.service_name as string | null) ?? null,
      staff_name: (r.staff_name as string | null) ?? null,
    }));
  } catch {
    return [];
  }
}

export async function getOverallRating(): Promise<Rating | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("reviews").select("rating");
    if (!data || data.length === 0) return null;
    const sum = data.reduce((a, r) => a + (r as { rating: number }).rating, 0);
    return {
      rating: Math.round((sum / data.length) * 10) / 10,
      review_count: data.length,
    };
  } catch {
    return null;
  }
}

export async function getRatingsMap(
  view: "service_ratings" | "staff_ratings",
): Promise<Record<string, Rating>> {
  if (!isSupabaseConfigured) return {};
  try {
    const supabase = await createClient();
    const { data } = await supabase.from(view).select("*");
    const key = view === "service_ratings" ? "service_id" : "staff_id";
    const out: Record<string, Rating> = {};
    for (const row of data ?? []) {
      const r = row as Record<string, unknown>;
      out[r[key] as string] = {
        rating: Number(r.rating),
        review_count: r.review_count as number,
      };
    }
    return out;
  } catch {
    return {};
  }
}

export async function hasReviewed(appointmentId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const supabase = await createClient();
    const { count } = await supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("appointment_id", appointmentId);
    return (count ?? 0) > 0;
  } catch {
    return false;
  }
}
