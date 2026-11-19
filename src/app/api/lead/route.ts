import { addLead } from "@/lib/firebase/server";
import { newLeadId, validateLead } from "@/lib/lead";
import { USERNAME_RE } from "@/lib/username";

// Best-effort limit per server instance: a few submissions per address per window. The
// database rules are the real boundary; this only slows down a casual script.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const recent = new Map<string, number[]>();

function rateLimited(key: string, now: number) {
  const times = (recent.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  times.push(now);
  recent.set(key, times);
  if (recent.size > 5000) {
    recent.clear();
  }
  return times.length > MAX_PER_WINDOW;
}

const json = (status: number, body: object) => Response.json(body, { status });

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(request.url).host) {
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
  // Honeypot field and a minimum fill time catch most bots; they get a fake success.
  const startedAt = typeof body.t === "number" ? body.t : 0;
  if (body.website || !startedAt || now - startedAt < 2500) {
    return json(200, { ok: true });
  }
  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  if (rateLimited(`${ip}|${username}`, now)) {
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
