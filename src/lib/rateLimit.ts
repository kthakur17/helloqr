import "server-only";

// Best-effort limits per server instance. The database rules are the real boundary; these only
// slow down a casual script. Nothing here is persisted.
const buckets = new Map<string, number[]>();

export function rateLimited(key: string, max: number, windowMs: number, now = Date.now()): boolean {
  const times = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  times.push(now);
  buckets.set(key, times);
  if (buckets.size > 10_000) {
    buckets.clear();
  }
  return times.length > max;
}

export function clientIp(request: Request): string {
  return (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
}

export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return !origin || new URL(origin).host === new URL(request.url).host;
}

/** Bots fill hidden fields and submit instantly; both get a fake success. */
export function looksLikeBot(body: Record<string, unknown>, now = Date.now()): boolean {
  const startedAt = typeof body.t === "number" ? body.t : 0;
  return Boolean(body.website) || !startedAt || now - startedAt < 2500;
}
