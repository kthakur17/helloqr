/** 3-30 chars, lowercase letters, digits and inner hyphens. Mirrored in firestore.rules. */
export const USERNAME_RE = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;

/** Top-level routes and words that must never become someone's /<username>. Mirrored in firestore.rules. */
export const RESERVED_USERNAMES = [
  "about",
  "admin",
  "api",
  "app",
  "dashboard",
  "e",
  "event",
  "events",
  "help",
  "helloqr",
  "home",
  "login",
  "logout",
  "privacy",
  "settings",
  "signin",
  "signup",
  "support",
  "terms",
  "www",
];

export function usernameProblem(raw: string): string | null {
  const name = raw.trim().toLowerCase();
  if (name.length < 3) {
    return "At least 3 characters.";
  }
  if (name.length > 30) {
    return "At most 30 characters.";
  }
  if (!USERNAME_RE.test(name)) {
    return "Use lowercase letters, numbers and hyphens, starting and ending with a letter or number.";
  }
  if (RESERVED_USERNAMES.includes(name)) {
    return "That name is reserved.";
  }
  return null;
}

export function suggestUsername(displayName: string, email: string | null): string {
  const base = (displayName || email?.split("@")[0] || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30)
    .replace(/-+$/, "");
  return usernameProblem(base) ? "" : base;
}
