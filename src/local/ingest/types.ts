export interface RawMessage {
  sourceTool: "claude-code" | "codex" | "cursor" | "fixture";
  workspacePath?: string | null;
  sessionId: string;
  role: string;
  content: string;
  timestamp: number;
}

export interface IngestOptions {
  claudeDir?: string;
  codexDir?: string;
  cursorDir?: string;
  fixtureDir?: string;
  includeClaude: boolean;
  includeCodex: boolean;
  includeCursor: boolean;
  includeFixtures: boolean;
}
