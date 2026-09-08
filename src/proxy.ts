import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Resilience net: if an OAuth redirect lands anywhere other than
  // /auth/callback still carrying `code`, forward it there so the session
  // actually gets exchanged. This happens when Supabase's redirect allowlist
  // doesn't match and it falls back to the bare Site URL.
  if (pathname !== "/auth/callback" && searchParams.has("code")) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/callback";
    return NextResponse.redirect(url);
  }

  return updateSession(request);
}

// The routes that need a session (guarded account area, the booking flow, the
// sign-in page) plus the site root — only when it carries an auth `code`, to
// catch the Site-URL fallback above without pulling every "/" hit through here.
export const config = {
  matcher: [
    "/account/:path*",
    "/book/:path*",
    "/login",
    { source: "/", has: [{ type: "query", key: "code" }] },
  ],
};
