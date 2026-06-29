import { describe, expect, it } from "vitest";
import { getMimirConfig } from "../src/config.js";

describe("getMimirConfig", () => {
  it("defaults to dev embeddings", () => {
    const config = getMimirConfig({ MIMIR_HOME: "/tmp/mimir-test" });

    expect(config.homeDir).toBe("/tmp/mimir-test");
    expect(config.embeddingProvider).toBe("dev");
    expect(config.cloudUrl).toBe("https://api.mimir.cloud");
  });

  it("rejects unsupported embedding providers", () => {
    expect(() => getMimirConfig({ MIMIR_EMBEDDING_PROVIDER: "bad" })).toThrow(/Unsupported/);
  });

  it("normalizes cloud URLs", () => {
    const config = getMimirConfig({
      MIMIR_HOME: "/tmp/mimir-test",
      MIMIR_CLOUD_URL: "https://mimir.example.com///",
    });

    expect(config.cloudUrl).toBe("https://mimir.example.com");
  });

  it("allows localhost http for development but rejects remote http", () => {
    expect(getMimirConfig({ MIMIR_CLOUD_URL: "http://localhost:3000" }).cloudUrl).toBe("http://localhost:3000");
    expect(() => getMimirConfig({ MIMIR_CLOUD_URL: "http://mimir.example.com" })).toThrow(/https/);
  });
});
