import type { MetadataRoute } from "next";
import { getPublicSiteOrigin } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getPublicSiteOrigin();
  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/terms`, changeFrequency: "monthly", priority: 0.3 },
  ];
}
