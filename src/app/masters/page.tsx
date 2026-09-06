import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/ui/TopBar";
import { Avatar } from "@/components/ui/primitives";
import { createClient } from "@/lib/supabase/server";
import type { Staff } from "@/lib/supabase/types";

export default async function MastersPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("staff")
    .select("*")
    .eq("active", true)
    .order("name");
  const staff = (data ?? []) as Staff[];

  return (
    <AppShell>
      <TopBar title="Our team" />
      <div className="flex flex-col gap-3 p-4">
        {staff.map((s) => (
          <div
            key={s.id}
            className="flex gap-3 rounded-[var(--radius-md)] bg-surface-card p-4 shadow-[var(--shadow-card)]"
          >
            <Avatar name={s.name} size={52} />
            <div>
              <p className="text-[16px] font-bold text-text-primary">{s.name}</p>
              {s.title && (
                <p className="text-[13px] text-text-secondary">{s.title}</p>
              )}
              {s.bio && (
                <p className="mt-2 text-[13px] text-text-primary">{s.bio}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
