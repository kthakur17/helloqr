import { hrefFor, linkTitle } from "./links.ts";
import type { Lead, Profile } from "./types";

/** RFC 6350 text escaping. */
export function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

/** Folds a content line at 75 octets, never splitting a multi-byte character. */
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  const out: string[] = [];
  let current = "";
  let bytes = 0;
  for (const ch of line) {
    const size = encoder.encode(ch).length;
    const limit = out.length === 0 ? 75 : 74; // continuation lines start with a space
    if (bytes + size > limit) {
      out.push(current);
      current = "";
      bytes = 0;
    }
    current += ch;
    bytes += size;
  }
  out.push(current);
  return out.join("\r\n ");
}

function splitName(full: string): { family: string; given: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length < 2) {
    return { family: "", given: parts[0] ?? "" };
  }
  return { family: parts[parts.length - 1], given: parts.slice(0, -1).join(" ") };
}

/** A contact card for someone who shared their details, so the owner can add them to their phone. */
export function buildLeadVCard(lead: Lead): string {
  const { family, given } = splitName(lead.name);
  const lines = ["BEGIN:VCARD", "VERSION:3.0", `FN:${escapeText(lead.name)}`, `N:${escapeText(family)};${escapeText(given)};;;`];
  if (lead.company) {
    lines.push(`ORG:${escapeText(lead.company)}`);
  }
  if (lead.email) {
    lines.push(`EMAIL;TYPE=INTERNET:${escapeText(lead.email)}`);
  }
  if (lead.phone) {
    lines.push(`TEL;TYPE=CELL:${escapeText(lead.phone)}`);
  }
  const linkedin = lead.linkedin ? hrefFor({ type: "linkedin", value: lead.linkedin }) : null;
  if (linkedin) {
    lines.push(`item1.URL:${linkedin}`, "item1.X-ABLabel:LinkedIn");
  }
  if (lead.note) {
    lines.push(`NOTE:${escapeText(lead.note)}`);
  }
  lines.push("END:VCARD");
  return `${lines.map(foldLine).join("\r\n")}\r\n`;
}

/** vCard 3.0, which both Android and iOS import from a download. */
export function buildVCard(profile: Profile, profileUrl: string): string {
  const { family, given } = splitName(profile.displayName);
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${escapeText(profile.displayName)}`,
    `N:${escapeText(family)};${escapeText(given)};;;`,
  ];
  if (profile.headline) {
    lines.push(`TITLE:${escapeText(profile.headline)}`);
  }
  if (profile.contactEmail) {
    lines.push(`EMAIL;TYPE=INTERNET:${escapeText(profile.contactEmail)}`);
  }
  if (profile.contactPhone) {
    lines.push(`TEL;TYPE=CELL:${escapeText(profile.contactPhone)}`);
  }
  const photo = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(profile.photo);
  if (photo) {
    lines.push(`PHOTO;ENCODING=b;TYPE=JPEG:${photo[1]}`);
  }
  lines.push(`URL;TYPE=HelloQR:${profileUrl}`);
  let item = 1;
  for (const link of profile.links) {
    const href = hrefFor(link);
    if (!href || link.type === "email") {
      continue;
    }
    lines.push(`item${item}.URL:${href}`);
    lines.push(`item${item}.X-ABLabel:${escapeText(linkTitle(link))}`);
    item++;
  }
  const note = [profile.bio, ...profile.roles].filter(Boolean).join("\n");
  if (note) {
    lines.push(`NOTE:${escapeText(note)}`);
  }
  lines.push("END:VCARD");
  return `${lines.map(foldLine).join("\r\n")}\r\n`;
}
