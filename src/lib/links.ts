import type { LinkItem, LinkType } from "./types";

type Kind = "handle" | "url" | "email" | "phone";

interface LinkSpec {
  label: string;
  kind: Kind;
  /** Hosts a pasted URL must belong to (subdomains allowed). */
  hosts?: string[];
  /** Profile URL that a bare handle is appended to. */
  base?: string;
  /** URL path that precedes the handle, used to pull the handle out of a pasted URL. */
  prefix?: string;
  placeholder: string;
}

export const LINK_SPECS: Record<LinkType, LinkSpec> = {
  linkedin: {
    label: "LinkedIn",
    kind: "handle",
    hosts: ["linkedin.com"],
    base: "https://www.linkedin.com/in/",
    prefix: "/in/",
    placeholder: "LinkedIn ID or profile URL",
  },
  x: { label: "X", kind: "handle", hosts: ["x.com", "twitter.com"], base: "https://x.com/", prefix: "/", placeholder: "@handle" },
  github: { label: "GitHub", kind: "handle", hosts: ["github.com"], base: "https://github.com/", prefix: "/", placeholder: "username" },
  instagram: {
    label: "Instagram",
    kind: "handle",
    hosts: ["instagram.com"],
    base: "https://www.instagram.com/",
    prefix: "/",
    placeholder: "@handle",
  },
  youtube: {
    label: "YouTube",
    kind: "handle",
    hosts: ["youtube.com", "youtu.be"],
    base: "https://www.youtube.com/@",
    prefix: "/@",
    placeholder: "@channel or channel URL",
  },
  threads: {
    label: "Threads",
    kind: "handle",
    hosts: ["threads.net", "threads.com"],
    base: "https://www.threads.net/@",
    prefix: "/@",
    placeholder: "@handle",
  },
  medium: { label: "Medium", kind: "handle", hosts: ["medium.com"], base: "https://medium.com/@", prefix: "/@", placeholder: "@handle" },
  devto: { label: "DEV", kind: "handle", hosts: ["dev.to"], base: "https://dev.to/", prefix: "/", placeholder: "username" },
  hashnode: { label: "Hashnode blog", kind: "url", placeholder: "https://yourblog.hashnode.dev" },
  peerlist: { label: "Peerlist", kind: "handle", hosts: ["peerlist.io"], base: "https://peerlist.io/", prefix: "/", placeholder: "username" },
  leetcode: { label: "LeetCode", kind: "handle", hosts: ["leetcode.com"], base: "https://leetcode.com/u/", prefix: "/u/", placeholder: "username" },
  kaggle: { label: "Kaggle", kind: "handle", hosts: ["kaggle.com"], base: "https://www.kaggle.com/", prefix: "/", placeholder: "username" },
  stackoverflow: {
    label: "Stack Overflow",
    kind: "url",
    hosts: ["stackoverflow.com"],
    placeholder: "https://stackoverflow.com/users/…",
  },
  discord: { label: "Discord", kind: "url", hosts: ["discord.com", "discord.gg"], placeholder: "Server invite or profile URL" },
  telegram: { label: "Telegram", kind: "handle", hosts: ["t.me", "telegram.me"], base: "https://t.me/", prefix: "/", placeholder: "@username" },
  whatsapp: { label: "WhatsApp", kind: "phone", placeholder: "+91 98765 43210 (with country code)" },
  calendly: { label: "Calendly", kind: "url", hosts: ["calendly.com"], placeholder: "https://calendly.com/you" },
  behance: { label: "Behance", kind: "handle", hosts: ["behance.net"], base: "https://www.behance.net/", prefix: "/", placeholder: "username" },
  dribbble: { label: "Dribbble", kind: "handle", hosts: ["dribbble.com"], base: "https://dribbble.com/", prefix: "/", placeholder: "username" },
  email: { label: "Email", kind: "email", placeholder: "you@example.com" },
  website: { label: "Website", kind: "url", placeholder: "https://example.com" },
  custom: { label: "Other link", kind: "url", placeholder: "https://…" },
};

export const LINK_TYPE_ORDER = Object.keys(LINK_SPECS) as LinkType[];

const HANDLE_RE = /^[^\s/?#@<>"'`\\]{1,100}$/;
const EMAIL_RE = /^[^\s@<>()"',;]+@[^\s@<>()"',;]+\.[^\s@<>()"',;]{2,}$/;
const PHONE_RE = /^\d{8,15}$/;

function hostMatches(host: string, hosts: string[]) {
  const h = host.toLowerCase();
  return hosts.some((allowed) => h === allowed || h.endsWith(`.${allowed}`));
}

function parseHttpUrl(raw: string): URL | null {
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withScheme);
    if ((url.protocol !== "https:" && url.protocol !== "http:") || !url.hostname.includes(".")) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

function looksLikeUrl(raw: string) {
  return /^https?:\/\//i.test(raw) || /^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}(\/|$)/i.test(raw);
}

export type Normalized = { value: string; error?: undefined } | { value?: undefined; error: string };

/** Turns whatever the user typed or pasted into the stored value: a bare handle, a URL, an email or digits. */
export function normalizeLinkValue(type: LinkType, raw: string): Normalized {
  const spec = LINK_SPECS[type];
  const input = raw.trim();
  if (!input) {
    return { error: "Required." };
  }
  if (input.length > 300) {
    return { error: "That's too long." };
  }

  switch (spec.kind) {
    case "handle": {
      if (looksLikeUrl(input)) {
        const url = parseHttpUrl(input);
        if (!url || !hostMatches(url.hostname, spec.hosts ?? [])) {
          return { error: `That isn't a ${spec.label} link.` };
        }
        url.protocol = "https:";
        const prefix = spec.prefix ?? "/";
        let path = url.pathname;
        try {
          path = decodeURI(path);
        } catch {
          // Malformed escapes: keep the raw path.
        }
        if (path.startsWith(prefix)) {
          const rest = path.slice(prefix.length).replace(/\/+$/, "");
          if (rest && HANDLE_RE.test(rest)) {
            return { value: rest };
          }
        }
        // Company pages, channel IDs and similar keep the full URL.
        return { value: url.href };
      }
      const handle = input.replace(/^@/, "");
      if (!HANDLE_RE.test(handle)) {
        return { error: "Enter just the username, or paste the full profile URL." };
      }
      return { value: handle };
    }
    case "url": {
      const url = parseHttpUrl(input);
      if (!url) {
        return { error: "Enter a full web address." };
      }
      if (spec.hosts && !hostMatches(url.hostname, spec.hosts)) {
        return { error: `That isn't a ${spec.label} link.` };
      }
      return { value: url.href };
    }
    case "email":
      return EMAIL_RE.test(input) && input.length <= 120 ? { value: input } : { error: "Enter a valid email address." };
    case "phone": {
      // WhatsApp links need the full international number. A 10-digit number without "+" could be
      // from any country, so it is refused rather than guessed (wa.me treats it as a username).
      const compact = input.replace(/[\s().-]/g, "");
      const international = compact.startsWith("+") ? compact.slice(1) : compact.startsWith("00") ? compact.slice(2) : null;
      const digits = international ?? compact;
      if (!/^\d+$/.test(digits)) {
        return { error: "Use digits only, starting with your country code, e.g. +91 98765 43210." };
      }
      if (international === null && digits.length <= 10) {
        return { error: "Add your country code at the start, e.g. +91 98765 43210." };
      }
      return PHONE_RE.test(digits) ? { value: `+${digits}` } : { error: "That number doesn't look right. Include your country code, e.g. +91 98765 43210." };
    }
  }
}

/**
 * The href to put on the button, or null when the stored value is not safe to link to.
 * Values come from the database, so they are re-checked here rather than trusted.
 */
export function hrefFor(link: Pick<LinkItem, "type" | "value">): string | null {
  const spec = LINK_SPECS[link.type];
  if (!spec || typeof link.value !== "string") {
    return null;
  }
  const value = link.value;
  switch (spec.kind) {
    case "handle": {
      if (/^https:\/\//i.test(value)) {
        const url = parseHttpUrl(value);
        return url && url.protocol === "https:" && hostMatches(url.hostname, spec.hosts ?? []) ? url.href : null;
      }
      return HANDLE_RE.test(value) ? `${spec.base}${value}` : null;
    }
    case "url": {
      const url = parseHttpUrl(value);
      if (!url || !/^https?:\/\//i.test(value)) {
        return null;
      }
      return !spec.hosts || hostMatches(url.hostname, spec.hosts) ? url.href : null;
    }
    case "email":
      return EMAIL_RE.test(value) ? `mailto:${value}` : null;
    case "phone": {
      // Stored as "+<digits>" (older cards stored bare digits).
      const digits = value.replace(/^\+/, "");
      return PHONE_RE.test(digits) ? `https://wa.me/${digits}` : null;
    }
  }
}

/** Short text shown under the link title, e.g. "@kunal" or "example.com/blog". */
export function displayValue(link: Pick<LinkItem, "type" | "value">): string {
  const spec = LINK_SPECS[link.type];
  if (!spec) {
    return "";
  }
  if (spec.kind === "email") {
    return link.value;
  }
  if (spec.kind === "phone") {
    return `+${link.value.replace(/^\+/, "")}`;
  }
  if (spec.kind === "handle" && !/^https:\/\//i.test(link.value)) {
    return link.type === "linkedin" ? `in/${link.value}` : `@${link.value}`;
  }
  const url = parseHttpUrl(link.value);
  if (!url) {
    return link.value;
  }
  const text = `${url.hostname.replace(/^www\./, "")}${url.pathname === "/" ? "" : url.pathname.replace(/\/$/, "")}`;
  return text.length > 42 ? `${text.slice(0, 41)}…` : text;
}

export function linkTitle(link: Pick<LinkItem, "type" | "label">): string {
  return link.label.trim() || LINK_SPECS[link.type]?.label || "Link";
}

export function newLinkId(): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}
