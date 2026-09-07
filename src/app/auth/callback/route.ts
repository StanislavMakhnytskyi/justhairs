import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") ?? "/account";
  const next = rawNext.startsWith("/") ? rawNext : "/account";

  // Behind Vercel's load balancer `origin` can be an internal URL — trust the
  // forwarded host (and the configured site URL) instead.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const base =
    process.env.NODE_ENV === "development"
      ? origin
      : process.env.NEXT_PUBLIC_SITE_URL ||
        (forwardedHost ? `https://${forwardedHost}` : origin);

  if (!code) return NextResponse.redirect(`${base}/login?error=auth`);

  // The session cookies must land on the response we actually return, so bind
  // the Supabase client's cookie writes to it directly.
  const response = NextResponse.redirect(`${base}${next}`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(`${base}/login?error=auth`);

  return response;
}
