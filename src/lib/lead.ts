import { normalizeLinkValue } from "./links.ts";
import type { Lead } from "./types";

const EMAIL_RE = /^[^\s@<>()"',;]+@[^\s@<>()"',;]+\.[^\s@<>()"',;]{2,}$/;
const PHONE_RE = /^[+\d][\d\s()-]{5,29}$/;

export interface LeadInput {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  company?: unknown;
  linkedin?: unknown;
  note?: unknown;
}

const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** Shared by the form and the API route, so both reject exactly the same things. Mirrors firestore.rules. */
export function validateLead(input: LeadInput, now: number): { lead: Lead; error?: undefined } | { lead?: undefined; error: string } {
  const name = text(input.name);
  const email = text(input.email);
  const phone = text(input.phone);
  const company = text(input.company);
  const linkedinRaw = text(input.linkedin);
  const note = text(input.note);

  if (!name) {
    return { error: "Please add your name." };
  }
  if (name.length > 80 || company.length > 80 || note.length > 500) {
    return { error: "One of the fields is too long." };
  }
  if (!email && !phone) {
    return { error: "Add an email address or a phone number so they can reach you." };
  }
  if (email && (email.length > 120 || !EMAIL_RE.test(email))) {
    return { error: "That email address doesn't look right." };
  }
  if (phone && !PHONE_RE.test(phone)) {
    return { error: "Enter the phone number with its country code." };
  }
  let linkedin = "";
  if (linkedinRaw) {
    const normalized = normalizeLinkValue("linkedin", linkedinRaw);
    if (normalized.value === undefined || normalized.value.length > 200) {
      return { error: "Paste your LinkedIn profile link or just your LinkedIn ID." };
    }
    linkedin = normalized.value;
  }
  return { lead: { name, email, phone, company, linkedin, note, createdAt: now } };
}

export function newLeadId(): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}
