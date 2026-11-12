import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getPhoneError, normalizePhone } from "./phone";

describe("phone normalization", () => {
  it("accepts an 11-digit mainland China mobile number", () => {
    assert.equal(getPhoneError("13800138000"), null);
    assert.equal(normalizePhone(" 138 0013 8000 "), "13800138000");
    assert.equal(normalizePhone("+86-13800138000"), "13800138000");
  });

  it("rejects invalid phone numbers", () => {
    assert.equal(getPhoneError("12345"), "请输入有效的 11 位手机号");
    assert.equal(getPhoneError("10800138000"), "请输入有效的 11 位手机号");
  });
});
