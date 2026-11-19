import { ImageResponse } from "next/og";

export const alt = "HelloQR: your digital business card";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  const square = (x: number, y: number, s: number) => (
    <div style={{ display: "flex", position: "absolute", left: x, top: y, width: s, height: s, borderRadius: s * 0.22, background: "#fafafa" }} />
  );
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: "#ffffff", padding: 90, flexDirection: "column", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <div style={{ display: "flex", position: "relative", width: 84, height: 84, borderRadius: 20, background: "#09090b" }}>
            {square(21, 21, 16)}
            {square(47, 21, 16)}
            {square(21, 47, 16)}
            {square(47, 47, 7)}
            {square(56, 56, 7)}
          </div>
          <div style={{ display: "flex", fontSize: 44, fontWeight: 700, color: "#09090b" }}>HelloQR</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 82, fontWeight: 700, color: "#09090b", letterSpacing: -2, lineHeight: 1.05 }}>
            One QR code for every way to reach you.
          </div>
          <div style={{ display: "flex", marginTop: 28, fontSize: 34, color: "#71717a" }}>
            LinkedIn, X, website and contact details in a single scan.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
