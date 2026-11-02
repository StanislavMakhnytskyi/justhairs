import type { NextConfig } from "next";

const supabaseHost = (() => {
  try {
    return new URL(
      process.env.NEXT_PUBLIC_SUPABASE_URL ??
        "https://vyrgrzmsslcaztkydlng.supabase.co",
    ).hostname;
  } catch {
    return "vyrgrzmsslcaztkydlng.supabase.co";
  }
})();

const isDev = process.env.NODE_ENV !== "production";
const supabaseOrigin = `https://${supabaseHost}`;

/**
 * Content-Security-Policy, shipped as REPORT-ONLY first (violations show in the
 * browser console and block nothing).
 *
 * Why 'unsafe-inline' for scripts: the pages are statically generated / ISR, so
 * there is no per-request nonce, and Next's own inline RSC/bootstrap scripts
 * (plus our ThemeScript) cannot be hashed by hand. The two stricter routes in
 * node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md are
 * nonces (needs a proxy and makes every page dynamic) or experimental SRI.
 *
 * To promote it to enforcing, after a clean pass through the whole booking
 * flow (incl. Stripe redirect, map, analytics) with no violations logged:
 *   1. rename the header key below to "Content-Security-Policy";
 *   2. optionally tighten script-src (nonce via proxy, or `experimental.sri`);
 *   3. add a `report-uri` / `report-to` endpoint if you want to collect them.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://js.stripe.com https://va.vercel-scripts.com`,
  "style-src 'self' 'unsafe-inline'",
  // Supabase storage photos, ArcGIS map tiles, inline SVG/blur placeholders.
  `img-src 'self' data: blob: ${supabaseOrigin} https://server.arcgisonline.com`,
  `media-src 'self' blob: ${supabaseOrigin}`,
  "font-src 'self' data:",
  "connect-src 'self' https://vitals.vercel-insights.com https://va.vercel-scripts.com",
  "frame-src https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://checkout.stripe.com",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy-Report-Only", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(self)",
  },
  ...(isDev
    ? []
    : [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains",
        },
      ]),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseHost,
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Pages that show a guest's booking: never cached by browsers or CDNs.
      {
        source: "/book/pay/:path*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
      {
        source: "/book/confirmation/:path*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
};

export default nextConfig;
