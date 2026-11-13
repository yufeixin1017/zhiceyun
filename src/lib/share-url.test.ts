import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildShareBaseUrl, getConfiguredBaseUrl, isLoopbackHost } from "./share-url";

function withEnv(value: string | undefined, run: () => void) {
  const previous = process.env.PUBLIC_BASE_URL;
  if (value === undefined) delete process.env.PUBLIC_BASE_URL;
  else process.env.PUBLIC_BASE_URL = value;
  try {
    run();
  } finally {
    if (previous === undefined) delete process.env.PUBLIC_BASE_URL;
    else process.env.PUBLIC_BASE_URL = previous;
  }
}

describe("share url", () => {
  it("recognizes loopback hosts that phones cannot reach", () => {
    assert.equal(isLoopbackHost("127.0.0.1"), true);
    assert.equal(isLoopbackHost("localhost"), true);
    assert.equal(isLoopbackHost("192.168.1.20"), false);
    assert.equal(isLoopbackHost("quiz.example.com"), false);
  });

  it("prefers an explicitly configured public base url", () => {
    withEnv("https://quiz.example.com/", () => {
      assert.equal(getConfiguredBaseUrl(), "https://quiz.example.com");
      assert.equal(buildShareBaseUrl({ requestHost: "127.0.0.1:3000" }), "https://quiz.example.com");
    });
  });

  it("falls back to a LAN address when the teacher opened localhost", () => {
    withEnv(undefined, () => {
      const url = buildShareBaseUrl({ requestHost: "127.0.0.1:3000", lanAddresses: ["192.168.1.20"] });
      assert.equal(url, "http://192.168.1.20:3000");
    });
  });

  it("keeps the address the teacher is already using when it is not loopback", () => {
    withEnv(undefined, () => {
      assert.equal(buildShareBaseUrl({ requestHost: "10.0.0.8:3000" }), "http://10.0.0.8:3000");
      assert.equal(
        buildShareBaseUrl({ requestHost: "demo.trycloudflare.com", forwardedProto: "https" }),
        "https://demo.trycloudflare.com",
      );
    });
  });
});