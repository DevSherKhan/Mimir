import { createHash } from "node:crypto";
import { EMBEDDING_DIMENSIONS, type EmbeddingProviderName } from "../config.js";

export interface EmbeddingProvider {
  name: EmbeddingProviderName;
  model: string;
  dimensions: number;
  embed(text: string): Promise<number[]>;
}

export function createEmbeddingProvider(name: EmbeddingProviderName): EmbeddingProvider {
  if (name === "openai") {
    return createOpenAiProvider();
  }

  return createDevProvider();
}

function createDevProvider(): EmbeddingProvider {
  return {
    name: "dev",
    model: "mimir-dev-hash-v1",
    dimensions: EMBEDDING_DIMENSIONS,
    async embed(text: string): Promise<number[]> {
      const vector = new Array<number>(EMBEDDING_DIMENSIONS).fill(0);
      const tokens = text.toLowerCase().match(/[a-z0-9_/-]+/g) ?? [];

      for (const token of tokens) {
        const digest = createHash("sha256").update(token).digest();
        const bucket = digest.readUInt32BE(0) % EMBEDDING_DIMENSIONS;
        const sign = digest[4] % 2 === 0 ? 1 : -1;
        vector[bucket] += sign;
      }

      return normalize(vector);
    },
  };
}

function createOpenAiProvider(): EmbeddingProvider {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required when MIMIR_EMBEDDING_PROVIDER=openai.");
  }

  return {
    name: "openai",
    model: "text-embedding-3-small",
    dimensions: EMBEDDING_DIMENSIONS,
    async embed(text: string): Promise<number[]> {
      const { default: OpenAI } = await import("openai");
      const client = new OpenAI();
      const response = await client.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
        encoding_format: "float",
      });

      const embedding = response.data[0]?.embedding;
      if (!embedding || embedding.length !== EMBEDDING_DIMENSIONS) {
        throw new Error(`OpenAI returned an unexpected embedding dimension: ${embedding?.length ?? 0}.`);
      }

      return embedding;
    },
  };
}

function normalize(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (magnitude === 0) {
    return vector;
  }

  return vector.map((value) => value / magnitude);
}
