import { getPublicProfile } from "@/lib/firebase/server";
import { asJpeg, cardPreviewImage } from "@/lib/ogCard";

export const alt = "HelloQR card";
export const size = { width: 1200, height: 630 };
export const contentType = "image/jpeg";

export default async function Image({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const profile = await getPublicProfile(username).catch(() => null);
  const host = (process.env.VERCEL_PROJECT_PRODUCTION_URL ?? "helloqr.vercel.app").replace(/^https?:\/\//, "");
  return asJpeg(cardPreviewImage(profile, username, host));
}
