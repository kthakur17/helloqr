// Picker order runs around the colour wheel. Keys are stored on profiles and listed in firestore.rules.
export const ACCENTS = ["slate", "indigo", "blue", "sky", "teal", "green", "yellow", "orange", "brown", "red", "pink", "purple"] as const;
export type Accent = (typeof ACCENTS)[number];

// Muted shades so cards stay professional; every one keeps white text above 4.5:1 contrast.
export const ACCENT_HEX: Record<Accent, string> = {
  slate: "#475569",
  indigo: "#4338ca",
  blue: "#2563eb",
  sky: "#0369a1",
  teal: "#0f766e",
  green: "#047857",
  yellow: "#b45309",
  orange: "#c2410c",
  brown: "#7c4a2d",
  red: "#be123c",
  pink: "#be185d",
  purple: "#6d28d9",
};

export const ACCENT_LABEL: Record<Accent, string> = {
  slate: "Slate",
  indigo: "Indigo",
  blue: "Blue",
  sky: "Sky",
  teal: "Teal",
  green: "Emerald",
  yellow: "Amber",
  orange: "Orange",
  brown: "Cocoa",
  red: "Crimson",
  pink: "Pink",
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
  /** Lets visitors send their own details from the card. Missing on older profiles = on. */
  acceptLeads?: boolean;
  createdAt: number;
  updatedAt: number;
}

/** Details a visitor chose to send to a card owner; stored at profiles/{username}/leads/{id}. */
export interface Lead {
  name: string;
  email: string;
  phone: string;
  company: string;
  /** A LinkedIn handle or profile URL, normalised like a card link. */
  linkedin: string;
  note: string;
  createdAt: number;
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
