import { homedir } from "node:os";
import { join, resolve } from "node:path";

export const EMBEDDING_DIMENSIONS = 1536;

export type EmbeddingProviderName = "dev" | "openai";

export interface MimirConfig {
  homeDir: string;
  dbPath: string;
  embeddingProvider: EmbeddingProviderName;
  cloudUrl: string;
}

export function expandHome(input: string): string {
  if (input === "~") {
    return homedir();
  }

  if (input.startsWith("~/")) {
    return join(homedir(), input.slice(2));
  }

  return input;
}

export function getMimirConfig(env: NodeJS.ProcessEnv = process.env): MimirConfig {
  const homeDir = resolve(expandHome(env.MIMIR_HOME ?? "~/.mimir"));
  const provider = parseEmbeddingProvider(env.MIMIR_EMBEDDING_PROVIDER);

  return {
    homeDir,
    dbPath: join(homeDir, "vault.db"),
    embeddingProvider: provider,
    cloudUrl: normalizeCloudUrl(env.MIMIR_CLOUD_URL ?? "https://api.mimir.cloud"),
  };
}

function parseEmbeddingProvider(value: string | undefined): EmbeddingProviderName {
  if (!value || value === "dev") {
    return "dev";
  }

  if (value === "openai") {
    return "openai";
  }

  throw new Error(`Unsupported MIMIR_EMBEDDING_PROVIDER "${value}". Use "dev" or "openai".`);
}

function normalizeCloudUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, "");
  const parsed = new URL(trimmed);

  if (parsed.protocol !== "https:" && parsed.hostname !== "localhost" && parsed.hostname !== "127.0.0.1") {
    throw new Error("MIMIR_CLOUD_URL must use https, except for localhost development.");
  }

  return trimmed;
}
