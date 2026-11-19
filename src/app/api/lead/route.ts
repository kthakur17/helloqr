import { addLead } from "@/lib/firebase/server";
import { newLeadId, validateLead } from "@/lib/lead";
import { clientIp, looksLikeBot, rateLimited, sameOrigin } from "@/lib/rateLimit";
import { USERNAME_RE } from "@/lib/username";

const json = (status: number, body: object) => Response.json(body, { status });

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return json(403, { error: "Not allowed." });
  }
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json(400, { error: "Invalid request." });
  }
  const username = typeof body.u === "string" ? body.u : "";
  if (!USERNAME_RE.test(username)) {
    return json(400, { error: "Invalid card." });
  }
  const now = Date.now();
  if (looksLikeBot(body, now)) {
    return json(200, { ok: true });
  }
  if (rateLimited(`lead|${clientIp(request)}|${username}`, 5, 10 * 60 * 1000, now)) {
    return json(429, { error: "You've sent a few already. Please try again later." });
  }
  const result = validateLead(body, now);
  if (!result.lead) {
    return json(400, { error: result.error });
  }
  try {
    await addLead(username, newLeadId(), result.lead);
  } catch (e) {
    const code = (e as { code?: string }).code;
    return code === "permission-denied"
      ? json(403, { error: "This card isn't accepting details right now." })
      : json(502, { error: "Couldn't send right now. Please try again." });
  }
  return json(200, { ok: true });
}
