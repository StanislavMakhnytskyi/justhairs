import Link from "next/link";
import { Badge } from "./primitives";
import { formatPrice } from "@/lib/format";
import type { AppointmentDetail } from "@/lib/appointments";
import type { AppointmentStatus } from "@/lib/supabase/types";

const STATUS: Record<AppointmentStatus, { label: string; tone: "success" | "neutral" | "warning" | "error" | "brand" }> = {
  pending: { label: "Pending", tone: "warning" },
  confirmed: { label: "Confirmed", tone: "brand" },
  completed: { label: "Completed", tone: "success" },
  cancelled: { label: "Cancelled", tone: "error" },
  no_show: { label: "No show", tone: "neutral" },
};

export function AppointmentCard({ appt }: { appt: AppointmentDetail }) {
  const when = new Date(appt.starts_at).toLocaleString("en-IE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const s = STATUS[appt.status];
  return (
    <Link
      href={`/account/appointments/${appt.id}`}
      className="block rounded-[var(--radius-md)] bg-surface-card p-4 shadow-[var(--shadow-card)]"
    >
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-text-secondary">{when}</span>
        <Badge tone={s.tone}>{s.label}</Badge>
      </div>
      <p className="mt-1 text-[16px] font-bold text-text-primary">{appt.service.name}</p>
      <p className="text-[13px] text-text-secondary">
        {appt.staff?.name ?? "Any specialist"} · {formatPrice(appt.price_cents)}
      </p>
    </Link>
  );
}
