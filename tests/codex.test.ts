import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { readCodexMessages } from "../src/local/ingest/codex.js";

describe("readCodexMessages", () => {
  it("reads Codex user and agent events while skipping internal context", () => {
    const root = join(tmpdir(), `mimir-codex-test-${Date.now()}`);
    const sessionDir = join(root, "sessions", "2026", "06", "29");
    mkdirSync(sessionDir, { recursive: true });

    writeFileSync(join(sessionDir, "rollout-2026-06-29T01-02-03-019f1234-1111-2222-3333-444444444444.jsonl"), [
      JSON.stringify({
        timestamp: "2026-06-29T01:02:03.000Z",
        type: "session_meta",
        payload: {
          session_id: "session-1",
          cwd: "/workspace/app",
        },
      }),
      JSON.stringify({
        timestamp: "2026-06-29T01:02:04.000Z",
        type: "event_msg",
        payload: {
          type: "user_message",
          message: "<environment_context>ignore me</environment_context>",
        },
      }),
      JSON.stringify({
        timestamp: "2026-06-29T01:02:05.000Z",
        type: "event_msg",
        payload: {
          type: "user_message",
          message: "Please add Codex ingestion to Mimir.",
        },
      }),
      JSON.stringify({
        timestamp: "2026-06-29T01:02:06.000Z",
        type: "event_msg",
        payload: {
          type: "agent_message",
          message: "Codex ingestion is now wired through sync.",
        },
      }),
    ].join("\n"));

    writeFileSync(join(root, "history.jsonl"), `${JSON.stringify({
      session_id: "session-2",
      ts: 1782700000,
      text: "search older Codex sessions",
    })}\n`);

    writeFileSync(join(root, "session_index.jsonl"), `${JSON.stringify({
      id: "session-3",
      thread_name: "Codex ingestion",
      updated_at: "2026-06-29T01:03:00.000Z",
    })}\n`);

    const messages = readCodexMessages(root);

    expect(messages.map((message) => message.content)).toEqual([
      "Please add Codex ingestion to Mimir.",
      "Codex ingestion is now wired through sync.",
      "search older Codex sessions",
      "Codex thread: Codex ingestion",
    ]);
    expect(messages.every((message) => message.sourceTool === "codex")).toBe(true);
    expect(messages[0]?.workspacePath).toBe("/workspace/app");
  });
});
