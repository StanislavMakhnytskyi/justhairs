import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Guest booking pages (personal data) and machine endpoints.
      disallow: ["/book/pay", "/book/confirmation", "/api"],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
