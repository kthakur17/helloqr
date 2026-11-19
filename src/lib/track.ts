/** Fire-and-forget counter bump through the API route, so public pages never load the Firebase SDK. */
export function track(username: string, key: string) {
  try {
    const body = JSON.stringify({ u: username, k: key });
    if (!navigator.sendBeacon?.("/api/track", body)) {
      void fetch("/api/track", { method: "POST", body, keepalive: true }).catch(() => {});
    }
  } catch {
    // Analytics must never break the page.
  }
}
