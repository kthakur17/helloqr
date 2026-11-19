import { bumpCounter, getPublicProfile } from "@/lib/firebase/server";
import { buildVCard } from "@/lib/vcard";

export async function GET(request: Request, { params }: RouteContext<"/[username]/vcard">) {
  const { username } = await params;
  const profile = await getPublicProfile(username);
  if (!profile) {
    return new Response("Not found", { status: 404 });
  }
  const origin = new URL(request.url).origin;
  const card = buildVCard(profile, `${origin}/${username}`);
  try {
    await bumpCounter(username, "vcard");
  } catch {
    // The download matters more than the count.
  }
  return new Response(card, {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename="${username}.vcf"`,
      "Cache-Control": "no-store",
    },
  });
}
