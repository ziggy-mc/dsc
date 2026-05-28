"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

let authCodeService;

test.before(async () => {
  authCodeService = await import("../lib/authCodeService.js");
});

test("normalizeEmail trims and lowercases", () => {
  assert.equal(authCodeService.normalizeEmail("  USER@Example.COM "), "user@example.com");
});

test("generateSixDigitCode returns numeric 6-digit code", () => {
  const code = authCodeService.generateSixDigitCode();
  assert.match(code, /^\d{6}$/);
});

test("hashCode is deterministic and not plaintext", () => {
  const hashA = authCodeService.hashCode("123456");
  const hashB = authCodeService.hashCode("123456");

  assert.equal(hashA, hashB);
  assert.notEqual(hashA, "123456");
  assert.equal(hashA.length, 64);
});
