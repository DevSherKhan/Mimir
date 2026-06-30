import { chmodSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface CloudCredentials {
  cloudUrl: string;
  accessToken: string;
  userId?: string;
  expiresAt?: number;
  createdAt: number;
}

export function credentialsPath(homeDir: string): string {
  return join(homeDir, "cloud-auth.json");
}

export function readCredentials(homeDir: string): CloudCredentials | null {
  try {
    const parsed = JSON.parse(readFileSync(credentialsPath(homeDir), "utf8")) as CloudCredentials;
    if (!parsed.cloudUrl || !parsed.accessToken) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeCredentials(homeDir: string, credentials: CloudCredentials): void {
  mkdirSync(homeDir, { recursive: true, mode: 0o700 });
  const path = credentialsPath(homeDir);
  writeFileSync(path, `${JSON.stringify(credentials, null, 2)}\n`, { mode: 0o600 });
  chmodPrivate(path);
}

export function clearCredentials(homeDir: string): boolean {
  try {
    rmSync(credentialsPath(homeDir), { force: true });
    return true;
  } catch {
    return false;
  }
}

export function isExpired(credentials: CloudCredentials): boolean {
  return typeof credentials.expiresAt === "number" && credentials.expiresAt <= Date.now();
}

function chmodPrivate(path: string): void {
  try {
    chmodSync(path, 0o600);
  } catch {
    // Best effort for non-POSIX filesystems.
  }
}
