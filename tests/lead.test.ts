import assert from "node:assert/strict";
import { test } from "node:test";
import { newLeadId, validateLead } from "../src/lib/lead.ts";
import { buildLeadVCard } from "../src/lib/vcard.ts";

const NOW = 1_800_000_000_000;

test("a lead needs a name and at least one way to reach the person", () => {
  assert.equal(validateLead({ email: "a@b.co" }, NOW).error, "Please add your name.");
  assert.match(validateLead({ name: "Asha" }, NOW).error ?? "", /email address or a phone number/);
  assert.ok(validateLead({ name: "Asha", email: "asha@example.com" }, NOW).lead);
  assert.ok(validateLead({ name: "Asha", phone: "+91 98765 43210" }, NOW).lead);
});

test("lead fields are trimmed, checked and normalised", () => {
  const { lead } = validateLead(
    { name: "  Asha Rao ", email: "asha@example.com", company: " Northwind ", linkedin: "https://www.linkedin.com/in/asha-rao/", note: " hi " },
    NOW,
  );
  assert.deepEqual(lead, {
    name: "Asha Rao",
    email: "asha@example.com",
    phone: "",
    company: "Northwind",
    linkedin: "asha-rao",
    note: "hi",
    createdAt: NOW,
  });
});

test("bad or oversized lead input is rejected", () => {
  assert.ok(validateLead({ name: "A", email: "not-an-email" }, NOW).error);
  assert.ok(validateLead({ name: "A", phone: "abc" }, NOW).error);
  assert.ok(validateLead({ name: "A", email: "a@b.co", linkedin: "https://evil.example/in/x" }, NOW).error);
  assert.ok(validateLead({ name: "x".repeat(81), email: "a@b.co" }, NOW).error);
  assert.ok(validateLead({ name: "A", email: "a@b.co", note: "x".repeat(501) }, NOW).error);
  assert.ok(validateLead({ name: 42, email: "a@b.co" } as never, NOW).error, "non-strings count as empty");
});

test("lead ids match the rules' pattern", () => {
  for (let i = 0; i < 50; i++) {
    assert.match(newLeadId(), /^[a-z0-9]{20}$/);
  }
});

test("lead vCard carries the shared details", () => {
  const card = buildLeadVCard({
    name: "Asha Rao",
    email: "asha@example.com",
    phone: "+91 98765 43210",
    company: "Northwind, Inc",
    linkedin: "asha-rao",
    note: "Met at the panel",
    createdAt: NOW,
  });
  assert.match(card, /\r\nFN:Asha Rao\r\n/);
  assert.match(card, /\r\nORG:Northwind\\, Inc\r\n/);
  assert.match(card, /\r\nTEL;TYPE=CELL:\+91 98765 43210\r\n/);
  assert.match(card, /\r\nitem1\.URL:https:\/\/www\.linkedin\.com\/in\/asha-rao\r\n/);
});
