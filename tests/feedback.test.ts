import assert from "node:assert/strict";
import { test } from "node:test";
import { validateFeedback } from "../src/lib/feedback.ts";

const NOW = 1_800_000_000_000;

test("feedback needs a kind and a real message", () => {
  assert.match(validateFeedback({ message: "Love it, thanks" }, NOW).error ?? "", /Pick what/);
  assert.match(validateFeedback({ kind: "idea", message: "hi" }, NOW).error ?? "", /little more/);
  assert.ok(validateFeedback({ kind: "nonsense", message: "A real message" }, NOW).error);
  assert.ok(validateFeedback({ kind: "idea", message: "x".repeat(2001) }, NOW).error);
});

test("valid feedback is trimmed and keeps only same-site paths", () => {
  const { feedback } = validateFeedback({ kind: "problem", message: "  The QR page is slow  ", email: " me@example.com ", page: "/dashboard/qr" }, NOW);
  assert.deepEqual(feedback, { kind: "problem", message: "The QR page is slow", email: "me@example.com", page: "/dashboard/qr", createdAt: NOW });
  assert.equal(validateFeedback({ kind: "idea", message: "Dark mode please", page: "https://evil.example/x" }, NOW).feedback?.page, "");
});

test("a bad email is rejected but no email is fine", () => {
  assert.ok(validateFeedback({ kind: "idea", message: "Dark mode please", email: "nope" }, NOW).error);
  assert.equal(validateFeedback({ kind: "praise", message: "Great tool!" }, NOW).feedback?.email, "");
});
