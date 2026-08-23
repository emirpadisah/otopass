import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return { name: "otoköprü", short_name: "otoköprü", description: "Araç başvurusu ve teklif yönetimi", start_url: "/", display: "standalone", background_color: "#0b111b", theme_color: "#dc2626", lang: "tr", icons: [{ src: "/icon.png", sizes: "559x272", type: "image/png" }] };
}
