"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./booking";

const schema = z.object({
  appointmentId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(500).optional(),
});

export async function submitReview(
  input: z.infer<typeof schema>,
): Promise<ActionResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please add a star rating." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: appt } = await supabase
    .from("appointments")
    .select("id, service_id, staff_id, status, customer_id")
    .eq("id", parsed.data.appointmentId)
    .maybeSingle();

  if (!appt || appt.customer_id !== user.id) {
    return { ok: false, error: "Appointment not found." };
  }
  if (appt.status !== "completed") {
    return { ok: false, error: "You can review a visit once it's completed." };
  }

  const { error } = await supabase.from("reviews").insert({
    appointment_id: appt.id,
    customer_id: user.id,
    service_id: appt.service_id,
    staff_id: appt.staff_id,
    rating: parsed.data.rating,
    comment: parsed.data.comment || null,
  });

  if (error) {
    return {
      ok: false,
      error: error.code === "23505" ? "You already reviewed this visit." : "Could not save your review.",
    };
  }

  revalidatePath("/");
  revalidatePath("/account");
  revalidatePath("/account/appointments");
  return { ok: true, data: undefined };
}
