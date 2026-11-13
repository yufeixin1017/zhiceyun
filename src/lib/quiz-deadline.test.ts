import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getDeadline, getRemainingSeconds, isLateSubmission } from "./quiz-deadline";

const base = { publishedAt: "2026-01-01T10:00:00.000Z", durationMinutes: 10 };

describe("quiz deadline", () => {
  it("calculates the deadline from the publish time", () => {
    assert.equal(getDeadline(base)?.toISOString(), "2026-01-01T10:10:00.000Z");
  });

  it("returns null before the quiz is published", () => {
    assert.equal(getDeadline({ ...base, publishedAt: undefined }), null);
    assert.equal(isLateSubmission({ ...base, publishedAt: undefined }), false);
  });

  it("flags submissions at or after the deadline as late", () => {
    assert.equal(isLateSubmission(base, new Date("2026-01-01T10:09:59.000Z")), false);
    assert.equal(isLateSubmission(base, new Date("2026-01-01T10:10:00.000Z")), false);
    assert.equal(isLateSubmission(base, new Date("2026-01-01T10:10:01.000Z")), true);
  });

  it("never reports negative remaining time", () => {
    const deadline = getDeadline(base)!;
    assert.equal(getRemainingSeconds(deadline, new Date("2026-01-01T10:05:00.000Z")), 300);
    assert.equal(getRemainingSeconds(deadline, new Date("2026-01-01T11:00:00.000Z")), 0);
  });
});