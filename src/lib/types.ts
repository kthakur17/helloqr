export const ACCENTS = ["blue", "red", "yellow", "green", "purple"] as const;
export type Accent = (typeof ACCENTS)[number];

// Stored keys are fixed by firestore.rules; the shades are muted so cards stay professional.
export const ACCENT_HEX: Record<Accent, string> = {
  blue: "#2563eb",
  red: "#be123c",
  yellow: "#b45309",
  green: "#047857",
  purple: "#6d28d9",
};

export const ACCENT_LABEL: Record<Accent, string> = {
  blue: "Blue",
  red: "Crimson",
  yellow: "Amber",
  green: "Emerald",
  purple: "Violet",
};

export type LinkType =
  | "linkedin"
  | "x"
  | "github"
  | "instagram"
  | "youtube"
  | "threads"
  | "medium"
  | "devto"
  | "hashnode"
  | "peerlist"
  | "leetcode"
  | "kaggle"
  | "stackoverflow"
  | "discord"
  | "telegram"
  | "whatsapp"
  | "calendly"
  | "behance"
  | "dribbble"
  | "email"
  | "website"
  | "custom";

export interface LinkItem {
  id: string;
  type: LinkType;
  value: string;
  label: string;
}

/** Stored at profiles/{username}; readable by anyone who has the username. */
export interface Profile {
  uid: string;
  displayName: string;
  headline: string;
  bio: string;
  /** 320px JPEG data URL, a Google/GitHub avatar URL, or "". */
  photo: string;
  /** 72px version used in attendee lists and saved connections. */
  thumb: string;
  roles: string[];
  links: LinkItem[];
  accent: Accent;
  /** Shown publicly and put in the downloaded contact card when filled in. */
  contactEmail: string;
  contactPhone: string;
  createdAt: number;
  updatedAt: number;
}

export interface EventDoc {
  name: string;
  /** YYYY-MM-DD */
  date: string;
  venue: string;
  description: string;
  organiserUid: string;
  /** Closed events keep their attendee list but accept no new joins. */
  open: boolean;
  createdAt: number;
}

export interface Attendee {
  username: string;
  displayName: string;
  headline: string;
  thumb: string;
  joinedAt: number;
}

export interface JoinedEvent {
  name: string;
  date: string;
  joinedAt: number;
}

export interface Connection {
  displayName: string;
  headline: string;
  thumb: string;
  eventId: string;
  eventName: string;
  note: string;
  savedAt: number;
}

export type CounterKey = "views" | "scans" | "saves" | "vcard" | `click_${string}`;
