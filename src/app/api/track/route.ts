import { bumpCounter, COUNTER_KEY_RE } from "@/lib/firebase/server";
import type { CounterKey } from "@/lib/types";
import { USERNAME_RE } from "@/lib/username";

export async function POST(request: Request) {
  // Beacons from other sites are ignored; counters are a convenience, not an audit trail.
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(request.url).host) {
    return new Response(null, { status: 403 });
  }
  let body: unknown;
  try {
    body = JSON.parse(await request.text());
  } catch {
    return new Response(null, { status: 400 });
  }
  const { u, k } = (body ?? {}) as { u?: unknown; k?: unknown };
  if (typeof u !== "string" || typeof k !== "string" || !USERNAME_RE.test(u) || !COUNTER_KEY_RE.test(k)) {
    return new Response(null, { status: 400 });
  }
  try {
    await bumpCounter(u, k as CounterKey);
  } catch {
    // Unknown profile, rules rejection or Firebase down: the visitor's page is unaffected either way.
  }
  return new Response(null, { status: 204 });
}
