import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { join } from "node:path";

export interface InstallIdentity {
  installId: string;
  createdAt: number;
}

export function installIdentityPath(homeDir: string): string {
  return join(homeDir, "install.json");
}

export function readInstallIdentity(homeDir: string): InstallIdentity | null {
  try {
    const parsed = JSON.parse(readFileSync(installIdentityPath(homeDir), "utf8")) as InstallIdentity;
    if (!isInstallId(parsed.installId)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function getOrCreateInstallIdentity(homeDir: string): InstallIdentity {
  const existing = readInstallIdentity(homeDir);
  if (existing) {
    return existing;
  }

  const identity = {
    installId: `install_${randomUUID()}`,
    createdAt: Date.now(),
  };
  mkdirSync(homeDir, { recursive: true, mode: 0o700 });
  const path = installIdentityPath(homeDir);
  writeFileSync(path, `${JSON.stringify(identity, null, 2)}\n`, { mode: 0o600 });
  chmodPrivate(path);
  return identity;
}

export function isInstallId(value: unknown): value is string {
  return typeof value === "string"
    && /^install_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function chmodPrivate(path: string): void {
  try {
    chmodSync(path, 0o600);
  } catch {
    // Best effort for non-POSIX filesystems.
  }
}
