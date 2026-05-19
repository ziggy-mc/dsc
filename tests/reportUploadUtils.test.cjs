"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  extractSingleFile,
  isImageMimeType,
  sanitizeUploadFilename,
} = require("../lib/reportUploadUtils.cjs");

test("extractSingleFile supports array-shaped formidable files", () => {
  const file = { filepath: "/tmp/image.png" };
  assert.deepEqual(extractSingleFile([file]), file);
});

test("extractSingleFile supports single file object", () => {
  const file = { filepath: "/tmp/image.png" };
  assert.deepEqual(extractSingleFile(file), file);
});

test("extractSingleFile returns null for missing files", () => {
  assert.equal(extractSingleFile(undefined), null);
  assert.equal(extractSingleFile(null), null);
  assert.equal(extractSingleFile([]), null);
});

test("isImageMimeType accepts valid image mimetypes", () => {
  assert.equal(isImageMimeType("image/png"), true);
  assert.equal(isImageMimeType("IMAGE/JPEG"), true);
});

test("isImageMimeType rejects invalid mimetypes", () => {
  assert.equal(isImageMimeType("application/pdf"), false);
  assert.equal(isImageMimeType(""), false);
  assert.equal(isImageMimeType(undefined), false);
});

test("sanitizeUploadFilename keeps only safe chars and bounds length", () => {
  const unsafe = "bad name<>/?.png";
  assert.equal(sanitizeUploadFilename(unsafe), "bad_name____.png");

  const longName = "a".repeat(300) + ".png";
  assert.equal(sanitizeUploadFilename(longName).length, 128);
});
