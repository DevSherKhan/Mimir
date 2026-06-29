import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { readClaudeMessages } from "../src/ingest/claude.js";

describe("readClaudeMessages", () => {
  it("reads Claude JSONL message content", () => {
    const root = join(tmpdir(), `mimir-claude-test-${Date.now()}`);
    mkdirSync(root, { recursive: true });
    writeFileSync(join(root, "session-1.jsonl"), [
      JSON.stringify({
        sessionId: "session-1",
        cwd: "/workspace/app",
        timestamp: "2026-06-29T00:00:00.000Z",
        message: {
          role: "user",
          content: "Please explain the migration plan.",
        },
      }),
      JSON.stringify({
        sessionId: "session-1",
        timestamp: "2026-06-29T00:01:00.000Z",
        message: {
          role: "assistant",
          content: [{ type: "text", text: "The migration plan has three phases." }],
        },
      }),
    ].join("\n"));

    const messages = readClaudeMessages(root);

    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({
      sourceTool: "claude-code",
      sessionId: "session-1",
      workspacePath: "/workspace/app",
      role: "user",
      content: "Please explain the migration plan.",
      timestamp: 1782691200000,
    });
    expect(messages[1]?.content).toBe("The migration plan has three phases.");
  });
});
