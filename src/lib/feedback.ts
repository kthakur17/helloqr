export const FEEDBACK_KINDS = ["idea", "problem", "praise", "other"] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];

export const FEEDBACK_LABEL: Record<FeedbackKind, string> = {
  idea: "Idea",
  problem: "Problem",
  praise: "Praise",
  other: "Other",
};

/** Stored at feedback/{id}; readable only from the Firebase console. */
export interface Feedback {
  kind: FeedbackKind;
  message: string;
  email: string;
  /** The page the person came from, to give a problem report context. */
  page: string;
  createdAt: number;
}

const EMAIL_RE = /^[^\s@<>()"',;]+@[^\s@<>()"',;]+\.[^\s@<>()"',;]{2,}$/;

/** Shared by the form and the API route. Mirrors firestore.rules. */
export function validateFeedback(
  input: { kind?: unknown; message?: unknown; email?: unknown; page?: unknown },
  now: number,
): { feedback: Feedback; error?: undefined } | { feedback?: undefined; error: string } {
  const kind = FEEDBACK_KINDS.find((k) => k === input.kind);
  const message = typeof input.message === "string" ? input.message.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim() : "";
  const rawPage = typeof input.page === "string" ? input.page.trim() : "";
  if (!kind) {
    return { error: "Pick what your feedback is about." };
  }
  if (message.length < 5) {
    return { error: "Tell us a little more (at least a few words)." };
  }
  if (message.length > 2000) {
    return { error: "Please keep it under 2,000 characters." };
  }
  if (email && (email.length > 120 || !EMAIL_RE.test(email))) {
    return { error: "That email address doesn't look right." };
  }
  // Only same-site paths are kept; anything else is dropped rather than rejected.
  const page = /^\/[^\s]{0,199}$/.test(rawPage) ? rawPage : "";
  return { feedback: { kind, message, email, page, createdAt: now } };
}
