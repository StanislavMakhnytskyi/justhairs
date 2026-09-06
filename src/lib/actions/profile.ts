"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./booking";

const schema = z.object({
  full_name: z.string().trim().min(1).max(120).optional(),
  phone: z.string().trim().max(32).optional().or(z.literal("")),
  birthday: z.string().date().optional().or(z.literal("")),
  preferred_staff_id: z.string().uuid().nullable().optional(),
  notification_prefs: z
    .object({ email: z.boolean(), sms: z.boolean() })
    .optional(),
});

export async function updateProfile(
  input: z.infer<typeof schema>,
): Promise<ActionResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please check the form and try again." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const patch = { ...parsed.data };
  if (patch.phone === "") patch.phone = undefined;
  if (patch.birthday === "") patch.birthday = undefined;

  const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
  if (error) return { ok: false, error: "Could not save your profile." };
  revalidatePath("/account/profile");
  return { ok: true, data: undefined };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
