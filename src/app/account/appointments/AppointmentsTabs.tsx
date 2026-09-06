"use client";

import { useState } from "react";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";

type Tab = "upcoming" | "past" | "cancelled";

export function AppointmentsTabs({
  upcoming,
  past,
  cancelled,
}: Record<Tab, React.ReactNode>) {
  const [tab, setTab] = useState<Tab>("upcoming");
  return (
    <div className="flex flex-col gap-4">
      <SegmentedTabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "upcoming", label: "Upcoming" },
          { value: "past", label: "Past" },
          { value: "cancelled", label: "Cancelled" },
        ]}
      />
      {tab === "upcoming" ? upcoming : tab === "past" ? past : cancelled}
    </div>
  );
}
