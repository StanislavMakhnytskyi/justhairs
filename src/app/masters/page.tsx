import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/ui/TopBar";
import { Stack } from "@/components/ui/Section";
import { EmptyState } from "@/components/ui/primitives";
import { MasterCard, type Master } from "@/components/ui/MasterCard";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getRatingsMap } from "@/lib/reviews";
import { summariseHours } from "@/lib/salon";
import type { Staff } from "@/lib/supabase/types";

export const metadata: Metadata = {
  title: "Our team — justhairs",
  description: "Meet the stylists and barbers at justhairs.",
};

type Row = Staff & {
  staff_services: { services: { name: string } | null }[];
  staff_working_hours: { weekday: number; start_time: string; end_time: string }[];
};

export default async function MastersPage() {
  let rows: Row[] = [];
  try {
    if (!isSupabaseConfigured) throw new Error("not configured");
    const supabase = await createClient();
    const { data } = await supabase
      .from("staff")
      .select(
        "*, staff_services(services(name)), staff_working_hours(weekday, start_time, end_time)",
      )
      .eq("active", true)
      .order("name");
    rows = (data ?? []) as unknown as Row[];
  } catch {
    rows = [];
  }
  const ratings = await getRatingsMap("staff_ratings");

  const masters: Master[] = rows.map((s) => ({
    id: s.id,
    name: s.name,
    title: s.title,
    bio: s.bio,
    photo_url: s.photo_url,
    specialties: [
      ...new Set(
        (s.staff_services ?? [])
          .map((l) => l.services?.name)
          .filter((n): n is string => !!n),
      ),
    ],
    hours: summariseHours(s.staff_working_hours ?? []),
    rating: ratings[s.id],
  }));

  return (
    <AppShell>
      <TopBar title="Our team" />
      <div className="p-4">
        {masters.length === 0 ? (
          <EmptyState
            title="Team details unavailable"
            description="Check back shortly."
          />
        ) : (
          <Stack>
            {masters.map((m) => (
              <MasterCard key={m.id} master={m} />
            ))}
          </Stack>
        )}
      </div>
    </AppShell>
  );
}
