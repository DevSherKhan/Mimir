import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { readFixtureMessages } from "../src/ingest/fixtures.js";

describe("readFixtureMessages", () => {
  it("reads txt and jsonl fixture files", () => {
    const root = join(tmpdir(), `mimir-fixture-test-${Date.now()}`);
    mkdirSync(root, { recursive: true });
    writeFileSync(join(root, "notes.txt"), "A plain fixture memory.");
    writeFileSync(join(root, "chat.jsonl"), `${JSON.stringify({ content: "A JSONL fixture memory." })}\n`);

    const messages = readFixtureMessages(root);

    expect(messages.map((message) => message.content).sort()).toEqual([
      "A JSONL fixture memory.",
      "A plain fixture memory.",
    ]);
    expect(messages.every((message) => message.sourceTool === "fixture")).toBe(true);
  });
});
