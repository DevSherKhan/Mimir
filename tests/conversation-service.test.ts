import { describe, expect, it, vi } from "vitest";
import type { CloudDatabase } from "../src/cloud/db/types.js";
import { deriveConversationTitle, listConversationPage } from "../src/server/services/conversation.service.js";

describe("conversation service", () => {
  it("derives a readable bounded title from the first user memory", () => {
    expect(deriveConversationTitle("  #   Fix the authentication flow\nwithout exposing bearer tokens  ")).toBe(
      "Fix the authentication flow without exposing bearer tokens",
    );
    expect(deriveConversationTitle("word ".repeat(30))).toMatch(/…$/u);
    expect(deriveConversationTitle("   ")).toBe("Untitled conversation");
  });

  it("returns opaque cursor pagination for conversation summaries", async () => {
    const rows = [0, 1, 2].map((index) => ({
      sourceTool: "codex",
      workspacePath: "/repo",
      sessionId: `session-${index}`,
      titleSeed: `Conversation ${index}`,
      startedAt: 1782691200000 - index,
      lastActivityAt: 1782691300000 - index,
      memoryCount: 3,
    }));
    const listConversations = vi.fn(async () => rows);
    const database = { listConversations } as unknown as CloudDatabase;

    const first = await listConversationPage(database, "user-1", { limit: 2 });
    expect(first.conversations).toHaveLength(2);
    expect(first.conversations[0]).toMatchObject({ title: "Conversation 0" });
    expect(first.nextCursor).toEqual(expect.any(String));

    await listConversationPage(database, "user-1", { limit: 2, cursor: first.nextCursor! });
    expect(listConversations.mock.calls[1]?.[1]).toMatchObject({
      cursor: {
        sourceTool: "codex",
        sessionId: "session-1",
        lastActivityAt: 1782691299999,
      },
    });
  });
});
