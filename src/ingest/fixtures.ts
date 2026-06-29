import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { listFilesRecursive } from "./files.js";
import type { RawMessage } from "./types.js";

export function readFixtureMessages(root = join(process.cwd(), "fixtures")): RawMessage[] {
  if (!existsSync(root)) {
    return [];
  }

  const files = listFilesRecursive(root, (path) => path.endsWith(".jsonl") || path.endsWith(".txt"));
  const messages: RawMessage[] = [];

  for (const file of files) {
    const content = readFileSync(file, "utf8");
    if (!content.trim()) {
      continue;
    }

    if (file.endsWith(".jsonl")) {
      for (const line of content.split(/\r?\n/)) {
        if (!line.trim()) {
          continue;
        }
        try {
          const parsed = JSON.parse(line) as Record<string, unknown>;
          const text = typeof parsed.content === "string" ? parsed.content : JSON.stringify(parsed);
          messages.push(toFixtureMessage(text, file));
        } catch {
          messages.push(toFixtureMessage(line, file));
        }
      }
    } else {
      messages.push(toFixtureMessage(content, file));
    }
  }

  return messages;
}

function toFixtureMessage(content: string, file: string): RawMessage {
  return {
    sourceTool: "fixture",
    sessionId: file,
    workspacePath: process.cwd(),
    role: "unknown",
    content,
    timestamp: Date.now(),
  };
}
