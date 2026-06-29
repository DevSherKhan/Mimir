import { describe, expect, it } from "vitest";
import { chunkText } from "../src/chunk.js";

describe("chunkText", () => {
  it("returns no chunks for empty text", () => {
    expect(chunkText("   ")).toEqual([]);
  });

  it("splits long text with overlap", () => {
    const text = Array.from({ length: 1000 }, (_, index) => `word${index}`).join(" ");
    const chunks = chunkText(text, 100, 20);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]?.content.split(/\s+/)).toHaveLength(100);
    expect(chunks[1]?.content.startsWith("word80 ")).toBe(true);
  });
});
