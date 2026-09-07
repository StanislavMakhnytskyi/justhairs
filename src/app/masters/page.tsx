import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/ui/TopBar";
import { Avatar, RatingBadge } from "@/components/ui/primitives";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getRatingsMap } from "@/lib/reviews";
import type { Staff } from "@/lib/supabase/types";

export const metadata: Metadata = {
  title: "Our team — justhairs",
  description: "Meet the stylists and barbers at justhairs.",
};

export default async function MastersPage() {
  let staff: Staff[] = [];
  try {
    if (!isSupabaseConfigured) throw new Error("not configured");
    const supabase = await createClient();
    const { data } = await supabase
      .from("staff")
      .select("*")
      .eq("active", true)
      .order("name");
    staff = (data ?? []) as Staff[];
  } catch {
    staff = [];
  }
  const ratings = await getRatingsMap("staff_ratings");

  return (
    <AppShell>
      <TopBar title="Our team" />
      <div className="flex flex-col gap-3 p-4">
        {staff.map((s) => {
          const r = ratings[s.id];
          return (
            <div
              key={s.id}
              className="flex gap-3 rounded-[var(--radius-md)] bg-surface-card p-4 shadow-[var(--shadow-card)]"
            >
              <Avatar name={s.name} size={52} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[16px] font-bold text-text-primary">{s.name}</p>
                  {r && r.review_count > 0 && (
                    <RatingBadge rating={r.rating} count={r.review_count} />
                  )}
                </div>
                {s.title && (
                  <p className="text-[13px] text-text-secondary">{s.title}</p>
                )}
                {s.bio && (
                  <p className="mt-2 text-[13px] text-text-primary">{s.bio}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
