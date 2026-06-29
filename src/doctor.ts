import { accessSync, constants, statSync } from "node:fs";
import { createRequire } from "node:module";
import { getMimirConfig } from "./config.js";

export interface DoctorCheck {
  name: string;
  ok: boolean;
  message: string;
}

export interface DoctorReport {
  ok: boolean;
  checks: DoctorCheck[];
}

export async function runDoctor(): Promise<DoctorReport> {
  const config = getMimirConfig();
  const checks: DoctorCheck[] = [
    checkNodeVersion(),
    checkMimirHome(config.homeDir),
    checkDatabaseFile(config.dbPath),
    checkPackage("better-sqlite3"),
    checkPackage("sqlite-vec"),
    checkSqliteNative(),
  ];

  return {
    ok: checks.every((check) => check.ok),
    checks,
  };
}

export function formatDoctorReport(report: DoctorReport): string {
  const lines = report.checks.map((check) => {
    const marker = check.ok ? "OK" : "FAIL";
    return `[${marker}] ${check.name}: ${check.message}`;
  });

  lines.push("");
  lines.push(report.ok ? "Mimir doctor passed." : "Mimir doctor found issues.");
  return lines.join("\n");
}

function checkNodeVersion(): DoctorCheck {
  const major = Number.parseInt(process.versions.node.split(".")[0] ?? "0", 10);
  return {
    name: "Node.js",
    ok: major >= 20,
    message: `${process.version} at ${process.execPath}${major >= 20 ? "" : " (Node 20+ required)"}`,
  };
}

function checkMimirHome(homeDir: string): DoctorCheck {
  try {
    const stat = statSync(homeDir);
    if (!stat.isDirectory()) {
      return {
        name: "MIMIR_HOME",
        ok: false,
        message: `${homeDir} exists but is not a directory`,
      };
    }

    return {
      name: "MIMIR_HOME",
      ok: true,
      message: homeDir,
    };
  } catch {
    return {
      name: "MIMIR_HOME",
      ok: true,
      message: `${homeDir} does not exist yet; run mimir init`,
    };
  }
}

function checkDatabaseFile(dbPath: string): DoctorCheck {
  try {
    accessSync(dbPath, constants.R_OK | constants.W_OK);
    return {
      name: "Database file",
      ok: true,
      message: `${dbPath} is readable and writable`,
    };
  } catch {
    return {
      name: "Database file",
      ok: true,
      message: `${dbPath} does not exist or is not writable yet; run mimir init`,
    };
  }
}

function checkPackage(packageName: string): DoctorCheck {
  try {
    const require = createRequire(import.meta.url);
    const resolved = require.resolve(packageName);
    return {
      name: packageName,
      ok: true,
      message: resolved,
    };
  } catch (error) {
    return {
      name: packageName,
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

function checkSqliteNative(): DoctorCheck {
  try {
    const require = createRequire(import.meta.url);
    const Database = require("better-sqlite3") as new (path: string) => { prepare: (sql: string) => { get: () => unknown }; close: () => void };
    const db = new Database(":memory:");
    db.prepare("SELECT 1").get();
    db.close();

    return {
      name: "SQLite native binding",
      ok: true,
      message: "better-sqlite3 loaded and executed a test query",
    };
  } catch (error) {
    return {
      name: "SQLite native binding",
      ok: false,
      message: `${error instanceof Error ? error.message : String(error)}. If this mentions native bindings, rebuild with the same Node binary used by your MCP client.`,
    };
  }
}

export function recommendedMcpJson(): string {
  return JSON.stringify({
    mcpServers: {
      mimir: {
        command: process.execPath,
        args: [`${import.meta.dirname}/cli.js`, "mcp"],
      },
    },
  }, null, 2);
}
