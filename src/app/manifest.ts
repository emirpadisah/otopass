import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return { name: "POL-CAR", short_name: "POL-CAR", description: "Araç alım operasyon platformu", start_url: "/", display: "standalone", background_color: "#f8fafc", theme_color: "#dc2626", lang: "tr", icons: [{ src: "/images/pol-car-logo.jpg", sizes: "1254x1254", type: "image/jpeg" }] };
}
