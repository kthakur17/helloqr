import { validateFeedback } from "@/lib/feedback";
import { addFeedback } from "@/lib/firebase/server";
import { newLeadId } from "@/lib/lead";
import { clientIp, looksLikeBot, rateLimited, sameOrigin } from "@/lib/rateLimit";

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
  const now = Date.now();
  if (looksLikeBot(body, now)) {
    return json(200, { ok: true });
  }
  if (rateLimited(`feedback|${clientIp(request)}`, 5, 60 * 60 * 1000, now)) {
    return json(429, { error: "Thanks, we've got several from you already. Please try again later." });
  }
  const result = validateFeedback(body, now);
  if (!result.feedback) {
    return json(400, { error: result.error });
  }
  try {
    await addFeedback(newLeadId(), result.feedback);
  } catch {
    return json(502, { error: "Couldn't send right now. Please try again." });
  }
  return json(200, { ok: true });
}
