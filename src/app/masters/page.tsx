import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/ui/TopBar";
import { Stack } from "@/components/ui/Section";
import { EmptyState } from "@/components/ui/primitives";
import { MasterCard } from "@/components/ui/MasterCard";
import { getCatalog } from "@/lib/queries";
import { buildMasters } from "@/lib/masters";
import { getRatingsMap } from "@/lib/reviews";

export const metadata: Metadata = {
  title: "Our team — justhairs",
  description: "Meet the stylists and barbers at justhairs.",
};

export const revalidate = 600;

export default async function MastersPage() {
  const [{ staff, staffServices, services, workingHours }, ratings] = await Promise.all([
    getCatalog(),
    getRatingsMap("staff_ratings"),
  ]);

  const masters = buildMasters(staff, staffServices, services, workingHours, ratings);

  return (
    <AppShell>
      <TopBar title="Our team" />
      <div className="p-gutter">
        {masters.length === 0 ? (
          <EmptyState title="Team details unavailable" description="Check back shortly." />
        ) : (
          <Stack>
            {masters.map((m) => (
              <MasterCard key={m.id} master={m} href={`/services?staff=${m.id}`} />
            ))}
          </Stack>
        )}
      </div>
    </AppShell>
  );
}
