"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { shouldShowImageThumbnail } = require("../lib/reportImageDisplayUtils.cjs");

test("shows thumbnail when imageUrl exists and has not failed", () => {
  assert.equal(shouldShowImageThumbnail("https://example.com/image.png", false), true);
});

test("hides thumbnail when image url is missing", () => {
  assert.equal(shouldShowImageThumbnail("", false), false);
  assert.equal(shouldShowImageThumbnail(null, false), false);
});

test("hides thumbnail when image load has failed", () => {
  assert.equal(shouldShowImageThumbnail("https://example.com/image.png", true), false);
});
