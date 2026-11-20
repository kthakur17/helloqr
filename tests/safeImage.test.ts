import assert from "node:assert/strict";
import { test } from "node:test";
import { safeCoverSrc, safeImageSrc } from "../src/lib/safeImage.ts";

const JPEG = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ==";

test("safeImageSrc: our data URLs and provider avatars pass", () => {
  assert.equal(safeImageSrc(JPEG), JPEG);
  assert.equal(safeImageSrc("https://lh3.googleusercontent.com/a/ACg8ocK=s96-c"), "https://lh3.googleusercontent.com/a/ACg8ocK=s96-c");
  assert.equal(safeImageSrc("https://avatars.githubusercontent.com/u/123?v=4"), "https://avatars.githubusercontent.com/u/123?v=4");
});

test("safeImageSrc: other hosts, look-alike hosts and odd schemes are dropped", () => {
  for (const bad of [
    "https://tracker.example/pixel.gif",
    "https://lh3.googleusercontent.com.evil.example/a.png",
    "https://evil.example/https://lh3.googleusercontent.com/a",
    "http://lh3.googleusercontent.com/a/x",
    "javascript:alert(1)",
    "data:image/svg+xml;base64,PHN2Zz4=",
    'https://lh3.googleusercontent.com/a/x" onerror="alert(1)',
    "",
    undefined,
  ]) {
    assert.equal(safeImageSrc(bad), null, String(bad));
  }
});

test("safeCoverSrc: only JPEG data URLs", () => {
  assert.equal(safeCoverSrc(JPEG), JPEG);
  assert.equal(safeCoverSrc("https://lh3.googleusercontent.com/a/x"), null);
  assert.equal(safeCoverSrc("data:image/png;base64,iVBORw0KGgo="), null);
  assert.equal(safeCoverSrc(`${JPEG}")`), null);
  assert.equal(safeCoverSrc(undefined), null);
});
