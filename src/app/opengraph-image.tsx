import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "otoköprü";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const logoImage = await readFile(join(process.cwd(), "public/images/otokopru-logo.png"));
const logoDataUrl = `data:image/png;base64,${logoImage.toString("base64")}`;

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#ffffff", color: "#111827" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoDataUrl} alt="" width="420" height="204" style={{ width: 420, height: 204, objectFit: "contain" }} />
        <div style={{ marginTop: 8, fontSize: 66, fontWeight: 800, lineHeight: 1 }}>otoköprü</div>
      </div>
    </div>,
    size
  );
}
