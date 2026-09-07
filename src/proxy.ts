import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

// Only the routes that actually need a session: the guarded account area, the
// booking flow (which renders differently when signed in) and the sign-in page.
// The public pages are statically generated — keeping them out of here means
// they serve straight from the CDN with no edge round-trip to Supabase.
export const config = {
  matcher: ["/account/:path*", "/book/:path*", "/login"],
};
