import { ImageResponse } from "next/og";
import { initials, safeImageSrc } from "@/components/Avatar";
import { ACCENT_HEX, type Profile } from "@/lib/types";

export const OG_SIZE = { width: 1200, height: 630 };
const COVER_H = 250;

function clip(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function PhotoDisc({ profile, accent, side, border }: { profile: Profile; accent: string; side: number; border: string }) {
  const photo = safeImageSrc(profile.photo);
  if (photo) {
    // eslint-disable-next-line @next/next/no-img-element -- rendered to PNG by Satori, not the browser
    return <img src={photo} alt="" width={side} height={side} style={{ borderRadius: 9999, objectFit: "cover", border }} />;
  }
  return (
    <div
      style={{
        display: "flex",
        width: side,
        height: side,
        borderRadius: 9999,
        background: accent,
        color: "#ffffff",
        fontSize: side * 0.4,
        alignItems: "center",
        justifyContent: "center",
        border,
      }}
    >
      {initials(profile.displayName)}
    </div>
  );
}

function Details({ profile, host, username, nameSize }: { profile: Profile; host: string; username: string; nameSize: number }) {
  const roles = profile.roles.slice(0, 3).join("  ·  ");
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", fontSize: profile.displayName.length > 22 ? nameSize * 0.8 : nameSize, fontWeight: 700, color: "#09090b", letterSpacing: -1.5, lineHeight: 1.05 }}>
        {profile.displayName}
      </div>
      {profile.headline && <div style={{ display: "flex", marginTop: 16, fontSize: 32, color: "#52525b", lineHeight: 1.3 }}>{clip(profile.headline, 90)}</div>}
      {roles && <div style={{ display: "flex", marginTop: 14, fontSize: 26, color: "#71717a" }}>{clip(roles, 80)}</div>}
      <div style={{ display: "flex", alignItems: "center", marginTop: 34, gap: 14, fontSize: 28, color: "#71717a" }}>
        <div style={{ display: "flex", width: 34, height: 34, borderRadius: 8, background: "#09090b" }} />
        {host}/{username}
      </div>
    </div>
  );
}

/**
 * ImageResponse only makes PNGs, and a photo cover turns that into ~900 KB, over what WhatsApp shows.
 * JPEG keeps a preview with a photo near 100 KB. Falls back to the PNG if sharp can't load.
 */
export async function asJpeg(image: ImageResponse): Promise<Response> {
  const png = Buffer.from(await image.arrayBuffer());
  const cacheControl = image.headers.get("cache-control") ?? "public, max-age=0, must-revalidate";
  try {
    const sharp = (await import("sharp")).default;
    const jpeg = await sharp(png).flatten({ background: "#ffffff" }).jpeg({ quality: 84, mozjpeg: true }).toBuffer();
    return new Response(new Uint8Array(jpeg), { headers: { "Content-Type": "image/jpeg", "Cache-Control": cacheControl } });
  } catch (e) {
    console.error("Link preview: sharp unavailable, serving PNG.", e);
    return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png", "Cache-Control": cacheControl } });
  }
}

/** The preview WhatsApp, LinkedIn, Slack and X show for a card link; uses the cover image as a banner when there is one. */
export function cardPreviewImage(profile: Profile | null, username: string, host: string): ImageResponse {
  if (!profile) {
    return new ImageResponse(
      (
        <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", background: "#ffffff", fontSize: 56, color: "#09090b" }}>
          HelloQR
        </div>
      ),
      OG_SIZE,
    );
  }

  const accent = ACCENT_HEX[profile.accent] ?? ACCENT_HEX.blue;
  const cover = profile.cover && profile.cover.startsWith("data:image/") ? profile.cover : "";

  if (cover) {
    return new ImageResponse(
      (
        <div style={{ display: "flex", position: "relative", width: "100%", height: "100%", background: "#ffffff" }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- rendered to PNG by Satori, not the browser */}
          <img src={cover} alt="" width={OG_SIZE.width} height={COVER_H} style={{ position: "absolute", top: 0, left: 0, objectFit: "cover" }} />
          <div style={{ display: "flex", position: "absolute", left: 72, top: COVER_H - 120 }}>
            <PhotoDisc profile={profile} accent={accent} side={250} border="9px solid #ffffff" />
          </div>
          <div style={{ display: "flex", position: "absolute", left: 362, right: 72, top: COVER_H + 26 }}>
            <Details profile={profile} host={host} username={username} nameSize={64} />
          </div>
        </div>
      ),
      OG_SIZE,
    );
  }

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: "#ffffff" }}>
        <div style={{ display: "flex", width: 18, height: "100%", background: accent }} />
        <div style={{ display: "flex", flex: 1, alignItems: "center", padding: "0 80px", gap: 64 }}>
          <PhotoDisc profile={profile} accent={accent} side={300} border="6px solid #f4f4f5" />
          <Details profile={profile} host={host} username={username} nameSize={72} />
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
