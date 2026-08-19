import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "POL-CAR araç alım operasyon platformu";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const heroImage = await readFile(join(process.cwd(), "public/images/otopass-hero-inspection.jpg"));
const heroDataUrl = `data:image/jpeg;base64,${heroImage.toString("base64")}`;
const logoImage = await readFile(join(process.cwd(), "public/images/pol-car-logo.jpg"));
const logoDataUrl = `data:image/jpeg;base64,${logoImage.toString("base64")}`;

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "flex-end", padding: 72, color: "white", overflow: "hidden", background: "#101827" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={heroDataUrl} alt="" width="1200" height="630" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      <div style={{ position: "absolute", inset: 0, display: "flex", background: "linear-gradient(90deg, rgba(10,15,25,.94), rgba(10,15,25,.25))" }} />
      <div style={{ position: "relative", display: "flex", flexDirection: "column", maxWidth: 760 }}>
        <div style={{ position: "relative", display: "flex", width: 260, height: 106, overflow: "hidden", border: "1px solid rgba(255,255,255,.28)", borderRadius: 10, background: "white" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoDataUrl} alt="" width="260" height="260" style={{ position: "absolute", top: -79, left: 0, width: 260, height: 260 }} />
        </div>
        <div style={{ marginTop: 24, fontSize: 58, fontWeight: 800, lineHeight: 1.08 }}>Araç alım operasyonu, tek güvenli akışta.</div>
      </div>
    </div>,
    size
  );
}
