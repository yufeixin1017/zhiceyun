import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatDate, formatDateTime } from "./utils";

describe("date formatting", () => {
  it("displays UTC timestamps in Beijing time regardless of server timezone", () => {
    const formatted = formatDate("2026-11-13T07:56:00.000Z");
    assert.match(formatted, /15:56/);
    assert.doesNotMatch(formatted, /07:56/);
  });

  it("rolls over to the next day correctly in Beijing time", () => {
    const formatted = formatDate("2026-01-01T16:00:00.000Z");
    assert.match(formatted, /01\/02/);
    assert.match(formatted, /00:00/);
  });

  it("formats full timestamps in Beijing time for CSV exports", () => {
    const formatted = formatDateTime("2026-01-01T16:00:00.000Z");
    assert.match(formatted, /2026[/-]01[/-]02/);
    assert.match(formatted, /00:00:00/);
  });
});
