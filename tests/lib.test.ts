import assert from "node:assert/strict";
import { test } from "node:test";
import { toCsv } from "../src/lib/csv.ts";
import { displayValue, hrefFor, normalizeLinkValue } from "../src/lib/links.ts";
import type { LinkType, Profile } from "../src/lib/types.ts";
import { suggestUsername, usernameProblem } from "../src/lib/username.ts";
import { buildVCard, escapeText, foldLine } from "../src/lib/vcard.ts";

const norm = (type: LinkType, raw: string) => normalizeLinkValue(type, raw);

test("handles: bare names, @names and pasted profile URLs all become the handle", () => {
  assert.deepEqual(norm("linkedin", "kunal-thakur"), { value: "kunal-thakur" });
  assert.deepEqual(norm("linkedin", "https://www.linkedin.com/in/kunal-thakur/"), { value: "kunal-thakur" });
  assert.deepEqual(norm("linkedin", "linkedin.com/in/kunal-thakur?utm=x"), { value: "kunal-thakur" });
  assert.deepEqual(norm("x", "@kthakur_17"), { value: "kthakur_17" });
  assert.deepEqual(norm("x", "https://twitter.com/kthakur_17"), { value: "kthakur_17" });
  assert.deepEqual(norm("github", "https://github.com/kthakur17"), { value: "kthakur17" });
  assert.deepEqual(norm("youtube", "https://www.youtube.com/@gdgindore"), { value: "gdgindore" });
});

test("handles: non-profile URLs on the right site are kept whole; other sites are rejected", () => {
  assert.deepEqual(norm("linkedin", "https://www.linkedin.com/company/acme/"), { value: "https://www.linkedin.com/company/acme/" });
  assert.equal(norm("linkedin", "https://evil.example/in/kunal").error, "That isn't a LinkedIn link.");
  assert.equal(norm("linkedin", "https://linkedin.com.evil.example/in/kunal").error, "That isn't a LinkedIn link.");
  assert.ok(norm("github", "two words").error);
  assert.ok(norm("github", "").error);
});

test("urls, email and phone", () => {
  assert.deepEqual(norm("website", "example.com/blog"), { value: "https://example.com/blog" });
  assert.ok(norm("website", "javascript:alert(1)").error);
  assert.ok(norm("website", "data:text/html,hi").error);
  assert.ok(norm("calendly", "https://example.com/me").error);
  assert.deepEqual(norm("email", "me@example.com"), { value: "me@example.com" });
  assert.ok(norm("email", "not-an-email").error);
  assert.deepEqual(norm("whatsapp", "+91 98765 43210"), { value: "+919876543210" });
  assert.deepEqual(norm("whatsapp", "0091 98765-43210"), { value: "+919876543210" });
  assert.ok(norm("whatsapp", "12345").error);
});

test("WhatsApp numbers must carry a country code", () => {
  // wa.me reads a national number as a username: "@9876543210 isn't on WhatsApp".
  assert.match(norm("whatsapp", "9876543210").error ?? "", /country code/);
  assert.match(norm("whatsapp", "98765 43210").error ?? "", /country code/);
  assert.deepEqual(norm("whatsapp", "919876543210"), { value: "+919876543210" }, "older saved digits that include the code still pass");
  assert.deepEqual(norm("whatsapp", "+919876543210"), { value: "+919876543210" }, "re-checking a saved value is stable");
  assert.equal(hrefFor({ type: "whatsapp", value: "+919876543210" }), "https://wa.me/919876543210");
  assert.equal(displayValue({ type: "whatsapp", value: "+919876543210" }), "+919876543210");
  assert.ok(norm("whatsapp", "+91 abc").error);
});

test("hrefFor re-validates stored values and never emits a script URL", () => {
  assert.equal(hrefFor({ type: "linkedin", value: "kunal" }), "https://www.linkedin.com/in/kunal");
  assert.equal(hrefFor({ type: "whatsapp", value: "919876543210" }), "https://wa.me/919876543210");
  assert.equal(hrefFor({ type: "email", value: "me@example.com" }), "mailto:me@example.com");
  assert.equal(hrefFor({ type: "website", value: "javascript:alert(1)" }), null);
  assert.equal(hrefFor({ type: "custom", value: "example.com" }), null, "stored URLs must already carry a scheme");
  assert.equal(hrefFor({ type: "linkedin", value: "https://evil.example/in/x" }), null);
  assert.equal(hrefFor({ type: "linkedin", value: "http://www.linkedin.com/in/x" }), null, "handle URLs must be https");
  assert.equal(hrefFor({ type: "github", value: "a/b" }), null);
  assert.equal(hrefFor({ type: "nope" as LinkType, value: "x" }), null);
});

test("displayValue", () => {
  assert.equal(displayValue({ type: "linkedin", value: "kunal" }), "in/kunal");
  assert.equal(displayValue({ type: "github", value: "kthakur17" }), "@kthakur17");
  assert.equal(displayValue({ type: "website", value: "https://www.example.com/" }), "example.com");
  assert.equal(displayValue({ type: "whatsapp", value: "919876543210" }), "+919876543210");
});

test("usernames", () => {
  assert.equal(usernameProblem("kunal"), null);
  assert.equal(usernameProblem("kunal-thakur-17"), null);
  assert.ok(usernameProblem("ab"));
  assert.ok(usernameProblem("-kunal"));
  assert.ok(usernameProblem("kunal-"));
  assert.ok(usernameProblem("Kunal_T"));
  assert.ok(usernameProblem("dashboard"));
  assert.equal(suggestUsername("Kunal Thakur", null), "kunal-thakur");
  assert.equal(suggestUsername("", "kunal.t@example.com"), "kunal-t");
  assert.equal(suggestUsername("Zoë", null), "zoe");
  assert.equal(suggestUsername("कुणाल", null), "");
});

test("vCard escaping and folding", () => {
  assert.equal(escapeText("a,b;c\\d\ne"), "a\\,b\\;c\\\\d\\ne");
  const long = `NOTE:${"é".repeat(80)}`;
  const folded = foldLine(long);
  for (const line of folded.split("\r\n")) {
    assert.ok(new TextEncoder().encode(line).length <= 75, "each physical line fits in 75 octets");
  }
  assert.equal(folded.replace(/\r\n /g, ""), long);
});

test("vCard content", () => {
  const profile: Profile = {
    uid: "u",
    displayName: "Kunal Singh Thakur",
    headline: "Engineer, speaker",
    bio: "",
    photo: "",
    thumb: "",
    roles: ["Core team · GDG"],
    links: [
      { id: "a", type: "linkedin", value: "kunal", label: "" },
      { id: "b", type: "website", value: "javascript:alert(1)", label: "bad" },
    ],
    accent: "blue",
    contactEmail: "me@example.com",
    contactPhone: "",
    createdAt: 0,
    updatedAt: 0,
  };
  const card = buildVCard(profile, "https://helloqr.example/kunal");
  assert.match(card, /^BEGIN:VCARD\r\nVERSION:3\.0\r\n/);
  assert.match(card, /\r\nFN:Kunal Singh Thakur\r\n/);
  assert.match(card, /\r\nN:Thakur;Kunal Singh;;;\r\n/);
  assert.match(card, /\r\nTITLE:Engineer\\, speaker\r\n/);
  assert.match(card, /\r\nEMAIL;TYPE=INTERNET:me@example\.com\r\n/);
  assert.match(card, /\r\nitem1\.URL:https:\/\/www\.linkedin\.com\/in\/kunal\r\n/);
  assert.doesNotMatch(card, /javascript/);
  assert.doesNotMatch(card, /TEL/);
  assert.match(card, /END:VCARD\r\n$/);
});

test("CSV quotes cells and defuses formulas", () => {
  const csv = toCsv([
    ["Name", "Note"],
    ['=HYPERLINK("x")', 'said "hi", left'],
  ]);
  assert.equal(csv, '﻿"Name","Note"\r\n"\'=HYPERLINK(""x"")","said ""hi"", left"\r\n');
});
