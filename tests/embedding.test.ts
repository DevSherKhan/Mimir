import { describe, expect, it } from "vitest";
import { EMBEDDING_DIMENSIONS } from "../src/config/index.js";
import { createEmbeddingProvider } from "../src/core/embeddings/provider.js";

describe("dev embedding provider", () => {
  it("returns stable fixed-size vectors", async () => {
    const provider = createEmbeddingProvider("dev");

    const first = await provider.embed("database migration plan");
    const second = await provider.embed("database migration plan");

    expect(first).toHaveLength(EMBEDDING_DIMENSIONS);
    expect(second).toEqual(first);
  });
});
