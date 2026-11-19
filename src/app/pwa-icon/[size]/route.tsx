import { ImageResponse } from "next/og";
import { IconMark } from "@/lib/iconMark";

export async function GET(_request: Request, { params }: RouteContext<"/pwa-icon/[size]">) {
  const { size } = await params;
  const px = size === "512" ? 512 : 192;
  return new ImageResponse(<IconMark size={px} />, {
    width: px,
    height: px,
    headers: { "Cache-Control": "public, max-age=604800, immutable" },
  });
}
