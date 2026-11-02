import { createHash } from "node:crypto";
import { z } from "zod";
import { getAppointment } from "@/lib/appointments";
import { getHoldToken } from "@/lib/hold-token";
import { buildIcs } from "@/lib/ics";
import { LEGAL_CONTACT, SALON } from "@/lib/salon";

export const dynamic = "force-dynamic";

const notFound = () =>
  new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });

/**
 * "Add to calendar" for a confirmed booking: one VEVENT, downloaded as .ics.
 * Same gate as the confirmation page (id + this browser's hold-token cookie,
 * which is scoped to /book). Only booked appointments (paid or pay-at-salon)
 * get a calendar entry; an unpaid hold is not an appointment yet.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!z.guid().safeParse(id).success) return notFound();
  const appt = await getAppointment(id, await getHoldToken(id));
  if (!appt || appt.status === "cancelled" || appt.payment_status === "unpaid") {
    return notFound();
  }

  const ics = buildIcs({
    // Stable per booking (re-importing updates the same event) but not the id.
    uid: `${createHash("sha256").update(`justhairs:${appt.id}`).digest("hex").slice(0, 32)}@justhairs`,
    start: new Date(appt.starts_at),
    durationMin: appt.service.duration_min,
    summary: `${appt.service.name} at ${SALON.name}`,
    location: SALON.addressOneLine,
    description:
      `${appt.payment_status === "paid" ? "Paid in full." : "Pay at the salon after your visit."} ` +
      `To change or cancel, email ${LEGAL_CONTACT} with your confirmation code.`,
  });

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="justhairs-appointment.ics"',
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
