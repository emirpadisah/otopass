import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return { name: "OtoPass", short_name: "OtoPass", description: "Araç alım operasyon platformu", start_url: "/", display: "standalone", background_color: "#f4f6f8", theme_color: "#e62d35", lang: "tr", icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }] };
}
