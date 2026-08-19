import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return { name: "POL-CAR", short_name: "POL-CAR", description: "Araç alım operasyon platformu", start_url: "/", display: "standalone", background_color: "#0b111b", theme_color: "#dc2626", lang: "tr", icons: [{ src: "/icon.png", sizes: "512x512", type: "image/png" }] };
}
