import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getPasswordError, hashPassword, hashSessionToken, verifyPassword } from "./password";

describe("password and token security", () => {
  it("hashes and verifies a password without storing plain text", async () => {
    const password = "Classroom2026";
    const stored = await hashPassword(password);
    assert.equal(stored.includes(password), false);
    assert.equal(stored.startsWith("scrypt$"), true);
    assert.equal(await verifyPassword(password, stored), true);
    assert.equal(await verifyPassword("wrong-password", stored), false);
  });

  it("validates password strength", () => {
    assert.equal(getPasswordError("short1"), "密码长度应为 10–128 位");
    assert.equal(getPasswordError("onlyletters"), "密码需同时包含字母和数字");
    assert.equal(getPasswordError("Classroom2026"), null);
  });

  it("hashes session tokens deterministically without exposing the token", () => {
    const hash = hashSessionToken("session-token");
    assert.equal(hash.length, 64);
    assert.equal(hash.includes("session-token"), false);
    assert.equal(hash, hashSessionToken("session-token"));
  });
});
