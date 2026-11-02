import type { MetadataRoute } from "next";
import { getCatalog } from "@/lib/queries";
import { getSiteUrl } from "@/lib/env";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const { services } = await getCatalog();
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/services`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/masters`, changeFrequency: "monthly", priority: 0.6 },
    ...services.map((s) => ({
      url: `${base}/services/${s.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
