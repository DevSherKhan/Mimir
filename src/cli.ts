#!/usr/bin/env node
import { Command } from "commander";
import { redactSecrets } from "./security/redact.js";
import { formatSearchResult, normalizeSourceTool, parseOptionalTimestamp } from "./search.js";

interface SyncCommandOptions {
  source?: string;
  claudeDir?: string;
  codexDir?: string;
  cursorDir?: string;
  fixtureDir?: string;
  upload?: boolean;
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

interface LoginCommandOptions {
  cloudUrl?: string;
  token?: string;
}

interface UploadCommandOptions {
  limit: string;
  batchSize: string;
  dryRun?: boolean;
  force?: boolean;
  cloudUrl?: string;
}

const program = new Command();

program
  .name("mimir")
  .description("Local-first AI chat memory index.")
  .version("0.1.0")
  .helpCommand("help [command]", "display help for mimir or a command")
  .addHelpText("after", `
Examples:
  $ mimir init
  $ mimir sync --source fixtures
  $ mimir query "memory index"
  $ mimir help sync`);

program
  .command("init")
  .description("Create the Mimir home directory and database schema.")
  .action(async () => {
    const { getMimirConfig } = await import("./config.js");
    const { openMimirDatabase } = await import("./db.js");
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
  .option("--upload", "Upload pending sanitized chunks after sync")
  .action(async (options: SyncCommandOptions) => {
    const { getMimirConfig } = await import("./config.js");
    const { openMimirDatabase } = await import("./db.js");
    const { createEmbeddingProvider } = await import("./embeddings/provider.js");
    const { syncMessages } = await import("./sync.js");
    const { uploadPendingChunks } = await import("./upload.js");
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

      if (options.upload) {
        const uploadResult = await uploadPendingChunks({
          homeDir: config.homeDir,
          db: database.db,
          limit: 500,
          batchSize: 100,
          dryRun: false,
          force: false,
        });
        console.log(`Uploaded chunks: ${uploadResult.uploaded}/${uploadResult.selected}`);
      }
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
    const { getMimirConfig } = await import("./config.js");
    const { openMimirDatabase, searchChunks } = await import("./db.js");
    const { createEmbeddingProvider } = await import("./embeddings/provider.js");
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
    const { runMcpServer } = await import("./mcp.js");
    await runMcpServer();
  });

program
  .command("login")
  .description("Store cloud credentials for upload.")
  .option("--cloud-url <url>", "Mimir Cloud API URL")
  .option("--token <token>", "Store an existing bearer token without device flow")
  .action(async (options: LoginCommandOptions) => {
    const { getMimirConfig } = await import("./config.js");
    const { writeCredentials } = await import("./auth.js");
    const { createCloudClient } = await import("./cloud.js");
    const config = getMimirConfig({
      ...process.env,
      MIMIR_CLOUD_URL: options.cloudUrl ?? process.env.MIMIR_CLOUD_URL,
    });

    if (options.token) {
      writeCredentials(config.homeDir, {
        cloudUrl: config.cloudUrl,
        accessToken: options.token,
        createdAt: Date.now(),
      });
      console.log(`Stored cloud credentials for ${config.cloudUrl}`);
      return;
    }

    const client = createCloudClient(config.cloudUrl);
    const start = await client.startDeviceLogin();
    console.log(`Open: ${start.verificationUri}`);
    console.log(`Code: ${start.userCode}`);

    const intervalMs = Math.max(1, start.interval ?? 5) * 1000;
    const expiresAt = Date.now() + Math.max(60, start.expiresIn ?? 600) * 1000;
    while (Date.now() < expiresAt) {
      const completed = await client.completeDeviceLogin(start.deviceCode);
      if (completed) {
        writeCredentials(config.homeDir, {
          cloudUrl: config.cloudUrl,
          accessToken: completed.accessToken,
          userId: completed.userId,
          expiresAt: completed.expiresAt,
          createdAt: Date.now(),
        });
        console.log(`Logged in to ${config.cloudUrl}`);
        return;
      }
      await sleep(intervalMs);
    }

    throw new Error("Device login expired before completion.");
  });

program
  .command("logout")
  .description("Remove stored cloud credentials.")
  .action(async () => {
    const { getMimirConfig } = await import("./config.js");
    const { clearCredentials } = await import("./auth.js");
    const config = getMimirConfig();
    clearCredentials(config.homeDir);
    console.log("Removed stored cloud credentials.");
  });

program
  .command("status")
  .description("Show local database and cloud-auth status.")
  .option("--json", "Print structured JSON status")
  .action(async (options: { json?: boolean }) => {
    const { getMimirConfig } = await import("./config.js");
    const { readCredentials, isExpired } = await import("./auth.js");
    const { createCloudClient } = await import("./cloud.js");
    const { getLocalStats, openMimirDatabase } = await import("./db.js");
    const config = getMimirConfig();
    const credentials = readCredentials(config.homeDir);
    const database = openMimirDatabase(config.dbPath);

    try {
      const stats = getLocalStats(database.db, credentials?.cloudUrl ?? config.cloudUrl);
      const loggedIn = Boolean(credentials && !isExpired(credentials));
      const cloud = loggedIn && credentials
        ? await readCloudStatus(createCloudClient(credentials.cloudUrl), credentials.accessToken)
        : undefined;
      const status = {
        homeDir: config.homeDir,
        dbPath: config.dbPath,
        cloudUrl: credentials?.cloudUrl ?? config.cloudUrl,
        loggedIn,
        userId: credentials?.userId,
        cloud,
        stats,
      };

      if (options.json) {
        console.log(JSON.stringify(status, null, 2));
        return;
      }

      console.log(`Home: ${status.homeDir}`);
      console.log(`Database: ${status.dbPath}`);
      console.log(`Cloud: ${status.cloudUrl}`);
      console.log(`Logged in: ${status.loggedIn ? "yes" : "no"}`);
      if (status.userId) {
        console.log(`User: ${status.userId}`);
      }
      if (status.cloud?.ok) {
        console.log(`Cloud chunks: ${status.cloud.count}`);
      } else if (status.cloud) {
        console.log(`Cloud status: ${status.cloud.error}`);
      }
      console.log(`Messages: ${status.stats.messages}`);
      console.log(`Chunks: ${status.stats.chunks}`);
      console.log(`Uploaded chunks: ${status.stats.uploadedChunks}`);
      console.log(`Pending uploads: ${status.stats.pendingUploads}`);
    } finally {
      database.close();
    }
  });

program
  .command("upload")
  .description("Upload pending sanitized memory chunks to Mimir Cloud.")
  .option("--limit <number>", "Maximum chunks to upload", "500")
  .option("--batch-size <number>", "Chunks per request", "100")
  .option("--cloud-url <url>", "Override Mimir Cloud API URL")
  .option("--dry-run", "Show how many chunks would upload without sending data")
  .option("--force", "Re-upload chunks even if they were already marked uploaded locally")
  .action(async (options: UploadCommandOptions) => {
    const { getMimirConfig } = await import("./config.js");
    const { openMimirDatabase } = await import("./db.js");
    const { uploadPendingChunks } = await import("./upload.js");
    const config = getMimirConfig({
      ...process.env,
      MIMIR_CLOUD_URL: options.cloudUrl ?? process.env.MIMIR_CLOUD_URL,
    });
    const database = openMimirDatabase(config.dbPath);

    try {
      const result = await uploadPendingChunks({
        homeDir: config.homeDir,
        db: database.db,
        cloudUrl: options.cloudUrl ? config.cloudUrl : undefined,
        limit: parseLimit(options.limit, 1, 10_000),
        batchSize: parseLimit(options.batchSize, 1, 500),
        dryRun: Boolean(options.dryRun),
        force: Boolean(options.force),
      });

      if (result.dryRun) {
        console.log(`Would upload ${result.selected} chunks to ${result.cloudUrl}${options.force ? " (force)" : ""}`);
      } else {
        console.log(`Uploaded ${result.uploaded}/${result.selected} chunks to ${result.cloudUrl}${options.force ? " (force)" : ""}`);
      }
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
    const { formatDoctorReport, recommendedMcpJson, runDoctor } = await import("./doctor.js");
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function readCloudStatus(client: { getMemoryCount(accessToken: string): Promise<{ count: number }> }, accessToken: string): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  try {
    const result = await client.getMemoryCount(accessToken);
    return { ok: true, count: result.count };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}
