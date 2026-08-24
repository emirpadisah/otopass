import type { MetadataRoute } from "next";
import { getPublicSiteOrigin } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const base = getPublicSiteOrigin();
  return { rules: [{ userAgent: "*", allow: ["/", "/form/"], disallow: ["/admin/", "/dealer/", "/api/", "/login/"] }], sitemap: `${base}/sitemap.xml`, host: base };
}
