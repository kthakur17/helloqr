import { ImageResponse } from "next/og";
import { initials, safeImageSrc } from "@/components/Avatar";
import { getPublicProfile } from "@/lib/firebase/server";
import { ACCENT_HEX } from "@/lib/types";

export const alt = "HelloQR card";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The preview WhatsApp, LinkedIn, Slack and X show when someone pastes a card link. */
export default async function Image({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const profile = await getPublicProfile(username).catch(() => null);
  const host = (process.env.VERCEL_PROJECT_PRODUCTION_URL ?? "helloqr.vercel.app").replace(/^https?:\/\//, "");

  if (!profile) {
    return new ImageResponse(
      (
        <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", background: "#ffffff", fontSize: 56, color: "#09090b" }}>
          HelloQR
        </div>
      ),
      size,
    );
  }

  const accent = ACCENT_HEX[profile.accent] ?? ACCENT_HEX.blue;
  const photo = safeImageSrc(profile.photo);
  const roles = profile.roles.slice(0, 3).join("  ·  ");

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: "#ffffff" }}>
        <div style={{ display: "flex", width: 18, height: "100%", background: accent }} />
        <div style={{ display: "flex", flex: 1, alignItems: "center", padding: "0 80px", gap: 64 }}>
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element -- rendered to PNG by Satori, not the browser
            <img src={photo} alt="" width={300} height={300} style={{ borderRadius: 9999, objectFit: "cover", border: "6px solid #f4f4f5" }} />
          ) : (
            <div
              style={{
                display: "flex",
                width: 300,
                height: 300,
                borderRadius: 9999,
                background: accent,
                color: "#ffffff",
                fontSize: 120,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {initials(profile.displayName)}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", fontSize: profile.displayName.length > 22 ? 58 : 72, fontWeight: 700, color: "#09090b", letterSpacing: -1.5, lineHeight: 1.05 }}>
              {profile.displayName}
            </div>
            {profile.headline && (
              <div style={{ display: "flex", marginTop: 18, fontSize: 34, color: "#52525b", lineHeight: 1.3 }}>
                {profile.headline.length > 90 ? `${profile.headline.slice(0, 89)}…` : profile.headline}
              </div>
            )}
            {roles && <div style={{ display: "flex", marginTop: 18, fontSize: 26, color: "#71717a" }}>{roles.length > 80 ? `${roles.slice(0, 79)}…` : roles}</div>}
            <div style={{ display: "flex", alignItems: "center", marginTop: 48, gap: 14, fontSize: 28, color: "#71717a" }}>
              <div style={{ display: "flex", width: 34, height: 34, borderRadius: 8, background: "#09090b" }} />
              {host}/{username}
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
