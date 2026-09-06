"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const bookSchema = z.object({
  serviceId: z.string().uuid(),
  staffId: z.string().uuid().nullable(),
  startsAt: z.string().datetime({ offset: true }),
});

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function createBooking(
  input: z.infer<typeof bookSchema>,
): Promise<ActionResult<{ id: string }>> {
  const parsed = bookSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid booking details." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in to confirm your booking." };

  const { data, error } = await supabase.rpc("book_appointment", {
    p_service_id: parsed.data.serviceId,
    p_staff_id: parsed.data.staffId,
    p_starts_at: parsed.data.startsAt,
  });

  if (error) {
    return {
      ok: false,
      error:
        error.message.includes("no longer available")
          ? "That time was just taken. Pick another slot."
          : "Could not create the booking. Please try again.",
    };
  }
  revalidatePath("/account");
  revalidatePath("/account/appointments");
  return { ok: true, data: { id: (data as { id: string }).id } };
}

export async function rescheduleAppointment(input: {
  appointmentId: string;
  staffId: string | null;
  startsAt: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("reschedule_appointment", {
    p_appointment_id: input.appointmentId,
    p_staff_id: input.staffId,
    p_starts_at: input.startsAt,
  });
  if (error) return { ok: false, error: "Could not reschedule. The slot may be taken." };
  revalidatePath("/account");
  revalidatePath("/account/appointments");
  return { ok: true, data: undefined };
}

export async function cancelAppointment(input: {
  appointmentId: string;
  reason?: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_appointment", {
    p_appointment_id: input.appointmentId,
    p_reason: input.reason ?? null,
  });
  if (error) return { ok: false, error: "Could not cancel this appointment." };
  revalidatePath("/account");
  revalidatePath("/account/appointments");
  return { ok: true, data: undefined };
}

export async function getAvailableSlots(input: {
  serviceId: string;
  staffId: string | null;
  day: string; // yyyy-MM-dd
}): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_available_slots", {
    p_service_id: input.serviceId,
    p_staff_id: input.staffId,
    p_day: input.day,
  });
  if (error || !data) return [];
  return (data as { starts_at: string }[]).map((s) => s.starts_at);
}
