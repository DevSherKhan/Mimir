import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { parse, stringify } from "smol-toml";

export interface AddMcpOptions {
  all?: boolean;
  claude?: boolean;
  codex?: boolean;
  cursor?: boolean;
}

interface SetupResult {
  tool: string;
  success: boolean;
  message: string;
}

export async function addMcpToTools(options: AddMcpOptions): Promise<boolean> {
  const tools = determineTools(options);
  const results: SetupResult[] = [];

  if (tools.includes("claude")) {
    results.push(await addToClaude());
  }

  if (tools.includes("codex")) {
    results.push(await addToCodex());
  }

  if (tools.includes("cursor")) {
    results.push(await addToCursor());
  }

  console.log("\n=== MCP Setup Results ===\n");
  for (const result of results) {
    const icon = result.success ? "✓" : "✗";
    console.log(`${icon} ${result.tool}: ${result.message}`);
  }

  const allSuccess = results.every((result) => result.success);
  if (!allSuccess) {
    console.log("\nSome tools could not be configured. Fix the errors above or configure MCP manually.");
    return false;
  }

  console.log("\nMCP configured successfully!");
  console.log("Restart your AI tools to activate the Mimir search tool.");
  return true;
}

function determineTools(options: AddMcpOptions): string[] {
  const selected = [];
  if (options.claude) selected.push("claude");
  if (options.codex) selected.push("codex");
  if (options.cursor) selected.push("cursor");

  if (options.all || selected.length === 0) {
    return ["claude", "codex", "cursor"];
  }

  return selected;
}

async function addToClaude(): Promise<SetupResult> {
  return new Promise((resolve) => {
    const claude = spawn("claude", ["mcp", "add", "mimir", "--", "mimir", "mcp"], {
      stdio: "pipe",
    });

    let stderr = "";
    claude.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    claude.on("close", (code) => {
      if (code === 0) {
        resolve({
          tool: "Claude Code",
          success: true,
          message: "MCP server added",
        });
        return;
      }

      resolve({
        tool: "Claude Code",
        success: false,
        message: `Failed to add MCP (${stderr.trim() || "unknown error"}). Try: claude mcp add mimir -- mimir mcp`,
      });
    });

    claude.on("error", (error) => {
      resolve({
        tool: "Claude Code",
        success: false,
        message: error.message.includes("ENOENT")
          ? "Claude Code CLI not found. Install it or run: claude mcp add mimir -- mimir mcp"
          : error.message,
      });
    });
  });
}

async function addToCodex(): Promise<SetupResult> {
  try {
    const configPath = join(homedir(), ".codex", "config.toml");
    if (!existsSync(configPath)) {
      return {
        tool: "Codex",
        success: false,
        message: "Config file not found at ~/.codex/config.toml. Install Codex first.",
      };
    }

    const content = readFileSync(configPath, "utf8");
    const config = parse(content) as Record<string, unknown>;
    const mcpServers = (isRecord(config.mcp_servers) ? config.mcp_servers : {}) as Record<string, unknown>;

    mcpServers.mimir = {
      command: "mimir",
      args: ["mcp"],
    };
    config.mcp_servers = mcpServers;

    writeFileSync(configPath, stringify(config), "utf8");

    return {
      tool: "Codex",
      success: true,
      message: "MCP server added to ~/.codex/config.toml",
    };
  } catch (error) {
    return {
      tool: "Codex",
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function addToCursor(): Promise<SetupResult> {
  try {
    const configPath = join(homedir(), ".cursor", "mcp.json");
    mkdirSync(dirname(configPath), { recursive: true });

    const existing = existsSync(configPath)
      ? JSON.parse(readFileSync(configPath, "utf8")) as unknown
      : {};
    const settings = isRecord(existing) ? existing : {};
    const mcpServers = isRecord(settings.mcpServers) ? settings.mcpServers : {};

    mcpServers.mimir = {
      command: "mimir",
      args: ["mcp"],
    };
    settings.mcpServers = mcpServers;

    writeFileSync(configPath, `${JSON.stringify(settings, null, 2)}\n`, "utf8");

    return {
      tool: "Cursor",
      success: true,
      message: "MCP server added to ~/.cursor/mcp.json",
    };
  } catch (error) {
    return {
      tool: "Cursor",
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
