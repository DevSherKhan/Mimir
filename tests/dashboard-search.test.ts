import { describe, expect, it } from "vitest";
import { buildMemorySearchParams } from "../dashboard/src/search.js";

describe("dashboard memory search", () => {
  it("builds a trimmed query with only active filters", () => {
    const params = buildMemorySearchParams({
      query: "  authentication decision  ",
      sourceTool: "codex",
      sessionId: "  session-123  ",
      workspacePath: "   ",
      limit: 10,
    });

    expect(Object.fromEntries(params)).toEqual({
      query: "authentication decision",
      limit: "10",
      sourceTool: "codex",
      sessionId: "session-123",
    });
  });

  it("supports filter-only browsing without a query parameter", () => {
    const params = buildMemorySearchParams({
      query: "   ",
      sourceTool: "codex",
      limit: 10,
    });

    expect(Object.fromEntries(params)).toEqual({
      limit: "10",
      sourceTool: "codex",
    });
  });
});
