import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";

// The hold token is a per-booking secret created in the database with the hold
// and handed to the browser that made it in an HttpOnly cookie. Everything that
// reads or changes a booking needs the id (in the URL) AND this token, so a
// leaked or guessed appointment id alone opens nothing.
const guid = z.guid();
const MAX_AGE_S = 60 * 60 * 24 * 30;

const cookieName = (appointmentId: string) => `jh_hold_${appointmentId}`;

export async function setHoldToken(appointmentId: string, token: string) {
  (await cookies()).set(cookieName(appointmentId), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // sent on the top-level redirect back from Stripe
    path: "/book",
    maxAge: MAX_AGE_S,
  });
}

/** The token this browser holds for the booking, or null if absent/malformed. */
export async function getHoldToken(appointmentId: string): Promise<string | null> {
  if (!guid.safeParse(appointmentId).success) return null;
  const value = (await cookies()).get(cookieName(appointmentId))?.value;
  return value && guid.safeParse(value).success ? value : null;
}
