#!/usr/bin/env node
import { Command } from "commander";
import { redactSecrets } from "../../core/security/redact.js";
import { formatSearchResult, normalizeSourceTool, parseOptionalTimestamp } from "../../core/search.js";
import { MIMIR_VERSION } from "../../version.js";

interface SyncCommandOptions {
  source?: string;
  claudeDir?: string;
  codexDir?: string;
  cursorDir?: string;
  fixtureDir?: string;
}

type SyncSource = "all" | "claude" | "codex" | "cursor" | "fixtures";

interface QueryCommandOptions {
  limit: string;
  source?: string;
  session?: string;
  workspace?: string;
  since?: string;
  until?: string;
  json?: boolean;
}

interface AddMcpCommandOptions {
  all?: boolean;
  claude?: boolean;
  codex?: boolean;
  cursor?: boolean;
}

const program = new Command();

program
  .name("mimir")
  .description("Local-first AI chat memory index.")
  .version(MIMIR_VERSION)
  .helpCommand("help [command]", "display help for mimir or a command")
  .addHelpText("after", `
Examples:
  $ mimir init
  $ mimir sync --source all
  $ mimir add-mcp --all
  $ mimir query "memory index"
  $ mimir help sync`);

program
  .command("init")
  .description("Create the Mimir home directory and database schema.")
  .action(async () => {
    const { getMimirConfig } = await import("../../config/index.js");
    const { openMimirDatabase } = await import("../db/sqlite.js");
    const config = getMimirConfig();
    const database = openMimirDatabase(config.dbPath);
    database.close();
    console.log(`Initialized Mimir at ${config.homeDir}`);
    console.log(`Database: ${config.dbPath}`);
  });

program
  .command("sync")
  .description("Index local AI chat history.")
  .option("--source <source>", "all, claude, codex, cursor, or fixtures", "all")
  .option("--claude-dir <path>", "Override Claude Code JSONL directory")
  .option("--codex-dir <path>", "Override Codex home directory")
  .option("--cursor-dir <path>", "Override Cursor workspaceStorage directory")
  .option("--fixture-dir <path>", "Read .jsonl/.txt fixtures from a directory")
  .action(async (options: SyncCommandOptions) => {
    const { getMimirConfig } = await import("../../config/index.js");
    const { openMimirDatabase } = await import("../db/sqlite.js");
    const { createEmbeddingProvider } = await import("../../core/embeddings/provider.js");
    const { syncMessages } = await import("../sync.js");
    const source = parseSource(options.source);
    const config = getMimirConfig();
    const provider = createEmbeddingProvider(config.embeddingProvider);
    const database = openMimirDatabase(config.dbPath);

    try {
      if (provider.name === "dev") {
        console.warn("Using development hash embeddings. Search quality is for pipeline testing only.");
      }

      const result = await syncMessages(database.db, provider, {
        claudeDir: options.claudeDir,
        codexDir: options.codexDir,
        cursorDir: options.cursorDir,
        fixtureDir: options.fixtureDir,
        includeClaude: source === "all" || source === "claude",
        includeCodex: source === "all" || source === "codex",
        includeCursor: source === "all" || source === "cursor",
        includeFixtures: source === "fixtures",
      });

      console.log(`Discovered messages: ${result.discovered}`);
      console.log(`Inserted messages: ${result.insertedMessages}`);
      console.log(`Inserted chunks: ${result.insertedChunks}`);
    } finally {
      database.close();
    }
  });

program
  .command("query")
  .description("Search indexed chat history.")
  .argument("<text>", "Query text")
  .option("-l, --limit <number>", "Maximum result count", "5")
  .option("--source <source>", "Filter by source: claude, codex, cursor, or fixtures")
  .option("--session <sessionId>", "Filter by session id")
  .option("--workspace <path>", "Filter by workspace path")
  .option("--since <timestamp>", "Filter results after ISO date, Unix seconds, or Unix milliseconds")
  .option("--until <timestamp>", "Filter results before ISO date, Unix seconds, or Unix milliseconds")
  .option("--json", "Print structured JSON results")
  .action(async (text: string, options: QueryCommandOptions) => {
    const { getMimirConfig } = await import("../../config/index.js");
    const { openMimirDatabase, searchChunks } = await import("../db/sqlite.js");
    const { createEmbeddingProvider } = await import("../../core/embeddings/provider.js");
    const limit = parseLimit(options.limit);
    const config = getMimirConfig();
    const provider = createEmbeddingProvider(config.embeddingProvider);
    const database = openMimirDatabase(config.dbPath);

    try {
      const embedding = await provider.embed(redactSecrets(text));
      const filters = {
        sourceTool: normalizeSourceTool(options.source),
        sessionId: options.session,
        workspacePath: options.workspace,
        since: parseOptionalTimestamp(options.since, "since"),
        until: parseOptionalTimestamp(options.until, "until"),
      };
      const results = searchChunks(database.db, embedding, limit, filters);

      if (options.json) {
        console.log(JSON.stringify(results.map(formatSearchResult), null, 2));
        return;
      }

      for (const [index, result] of results.entries()) {
        const formatted = formatSearchResult(result);
        console.log(`\n#${index + 1} score=${formatted.score.toFixed(4)} source=${formatted.sourceTool} role=${formatted.role}`);
        console.log(`time=${formatted.isoTimestamp}`);
        console.log(`session=${result.sessionId}`);
        if (result.workspacePath) {
          console.log(`workspace=${result.workspacePath}`);
        }
        console.log(result.content);
      }

      if (results.length === 0) {
        console.log("No indexed chunks found.");
      }
    } finally {
      database.close();
    }
  });

program
  .command("mcp")
  .description("Run the Mimir MCP server over stdio.")
  .action(async () => {
    const { runMcpServer } = await import("../mcp/stdio-server.js");
    await runMcpServer();
  });

program
  .command("add-mcp")
  .description("Configure Mimir MCP in Claude Code, Codex, and/or Cursor.")
  .option("--all", "Configure Claude Code, Codex, and Cursor")
  .option("--claude", "Configure Claude Code")
  .option("--codex", "Configure Codex")
  .option("--cursor", "Configure Cursor")
  .action(async (options: AddMcpCommandOptions) => {
    const { addMcpToTools } = await import("./add-mcp.js");
    const ok = await addMcpToTools(options);
    if (!ok) {
      process.exitCode = 1;
    }
  });

program
  .command("reset-local")
  .description("Clear local indexed memory and recreate an empty database.")
  .action(async () => {
    const { getMimirConfig } = await import("../../config/index.js");
    const { resetLocalDatabase } = await import("../db/reset.js");
    const config = getMimirConfig();
    const result = resetLocalDatabase(config.dbPath);

    console.log("Reset local Mimir database.");
    console.log(`Database: ${result.dbPath}`);
    if (result.deletedPaths.length > 0) {
      console.log("Deleted:");
      for (const path of result.deletedPaths) {
        console.log(`- ${path}`);
      }
    } else {
      console.log("No existing database files were found.");
    }
  });

program
  .command("status")
  .description("Show local database status.")
  .option("--json", "Print structured JSON status")
  .action(async (options: { json?: boolean }) => {
    const { getMimirConfig } = await import("../../config/index.js");
    const { getLocalStats, openMimirDatabase } = await import("../db/sqlite.js");
    const config = getMimirConfig();
    const database = openMimirDatabase(config.dbPath);

    try {
      const stats = getLocalStats(database.db);
      const status = {
        homeDir: config.homeDir,
        dbPath: config.dbPath,
        embeddingProvider: config.embeddingProvider,
        stats: {
          messages: stats.messages,
          chunks: stats.chunks,
        },
      };

      if (options.json) {
        console.log(JSON.stringify(status, null, 2));
        return;
      }

      console.log(`Home: ${status.homeDir}`);
      console.log(`Database: ${status.dbPath}`);
      console.log(`Embeddings: ${status.embeddingProvider}`);
      console.log(`Messages: ${status.stats.messages}`);
      console.log(`Chunks: ${status.stats.chunks}`);
    } finally {
      database.close();
    }
  });

program
  .command("doctor")
  .description("Check local Mimir setup and MCP runtime compatibility.")
  .option("--json", "Print structured JSON diagnostics")
  .option("--mcp-json", "Print an MCP config snippet using the current Node binary")
  .action(async (options: { json?: boolean; mcpJson?: boolean }) => {
    const { formatDoctorReport, recommendedMcpJson, runDoctor } = await import("../doctor.js");
    const report = await runDoctor();

    if (options.json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(formatDoctorReport(report));
    }

    if (options.mcpJson) {
      console.log("");
      console.log(recommendedMcpJson());
    }

    if (!report.ok) {
      process.exitCode = 1;
    }
  });

program.parseAsync(process.argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});

function parseSource(value: string | undefined): SyncSource {
  if (value === "all" || value === "claude" || value === "codex" || value === "cursor" || value === "fixtures") {
    return value;
  }

  throw new Error(`Unsupported source "${value}". Use all, claude, codex, cursor, or fixtures.`);
}

function parseLimit(value: string, min = 1, max = 20): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`Value must be an integer between ${min} and ${max}.`);
  }

  return parsed;
}
