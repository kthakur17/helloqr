import assert from "node:assert/strict";
import { test } from "node:test";
import { headlineSegments, wrapAtSeparators } from "../src/lib/headline.ts";

const measure = (s: string) => s.length * 10;
const HEADLINE = "Software Engineer · AI & Emerging Tech · Community Builder";

test("headlineSegments: splits on ·, | and • and keeps each separator", () => {
  assert.deepEqual(headlineSegments("Founder | Northwind • Mentor"), [
    { text: "Founder", sep: " | " },
    { text: "Northwind", sep: " • " },
    { text: "Mentor", sep: "" },
  ]);
  assert.deepEqual(headlineSegments("Product Designer at Northwind"), [{ text: "Product Designer at Northwind", sep: "" }]);
  // A middle dot inside a word is not a separator.
  assert.equal(headlineSegments("Node·js developer").length, 1);
});

test("wrapAtSeparators: breaks between items and drops the separator at the break", () => {
  assert.deepEqual(wrapAtSeparators(HEADLINE, 2, 400, measure), ["Software Engineer · AI & Emerging Tech", "Community Builder"]);
});

test("wrapAtSeparators: picks the most even split that fits", () => {
  assert.deepEqual(wrapAtSeparators("Aa · Bb · Cc · Dd", 2, 1000, measure), ["Aa · Bb", "Cc · Dd"]);
});

test("wrapAtSeparators: null when there is nothing to split on or an item is too wide", () => {
  assert.equal(wrapAtSeparators("Product Designer at Northwind", 2, 400, measure), null);
  assert.equal(wrapAtSeparators(HEADLINE, 2, 200, measure), null);
  assert.equal(wrapAtSeparators(HEADLINE, 4, 400, measure), null);
});
