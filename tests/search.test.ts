import { describe, expect, it } from "vitest";
import { formatSearchResult, normalizeSourceTool, parseOptionalTimestamp } from "../src/search.js";

describe("search helpers", () => {
  it("normalizes source aliases", () => {
    expect(normalizeSourceTool("claude")).toBe("claude-code");
    expect(normalizeSourceTool("fixtures")).toBe("fixture");
    expect(normalizeSourceTool("codex")).toBe("codex");
  });

  it("rejects unsupported sources", () => {
    expect(() => normalizeSourceTool("unknown")).toThrow(/Unsupported source/);
  });

  it("parses ISO, seconds, and milliseconds timestamps", () => {
    expect(parseOptionalTimestamp("2026-06-29T00:00:00.000Z", "since")).toBe(1782691200000);
    expect(parseOptionalTimestamp("1782691200", "since")).toBe(1782691200000);
    expect(parseOptionalTimestamp("1782691200000", "since")).toBe(1782691200000);
  });

  it("formats result scores and timestamps", () => {
    const formatted = formatSearchResult({
      chunkId: "chunk-1",
      sourceTool: "codex",
      workspacePath: "/repo",
      sessionId: "session-1",
      role: "assistant",
      timestamp: 1782691200000,
      distance: 0.1234567,
      content: "A useful memory",
    });

    expect(formatted.score).toBe(0.876543);
    expect(formatted.distance).toBe(0.123457);
    expect(formatted.isoTimestamp).toBe("2026-06-29T00:00:00.000Z");
  });
});
