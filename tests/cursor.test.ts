import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { readCursorMessages } from "../src/local/ingest/cursor.js";

describe("readCursorMessages", () => {
  it("reads likely chat text from Cursor state databases read-only", () => {
    const root = join(tmpdir(), `mimir-cursor-test-${Date.now()}`);
    const workspace = join(root, "workspace-1");
    mkdirSync(workspace, { recursive: true });

    const db = new Database(join(workspace, "state.vscdb"));
    db.exec("CREATE TABLE ItemTable (key TEXT PRIMARY KEY, value BLOB)");
    db.prepare("INSERT INTO ItemTable (key, value) VALUES (?, ?)").run(
      "composerData:test",
      JSON.stringify({
        messages: [
          {
            role: "user",
            content: "Please remember the Cursor architecture discussion for later search.",
          },
        ],
      }),
    );
    db.close();

    const messages = readCursorMessages(root);

    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      sourceTool: "cursor",
      role: "unknown",
      content: "Please remember the Cursor architecture discussion for later search.",
    });
  });
});
