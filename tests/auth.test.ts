import { mkdtempSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { clearCredentials, credentialsPath, isExpired, readCredentials, writeCredentials } from "../src/cloud/client/credentials.js";
import { getOrCreateInstallIdentity, installIdentityPath, readInstallIdentity } from "../src/cloud/client/install.js";

describe("cloud credentials", () => {
  it("stores credentials privately and reads them back", () => {
    const homeDir = mkdtempSync(join(tmpdir(), "mimir-auth-test-"));

    writeCredentials(homeDir, {
      cloudUrl: "https://mimir.example.com",
      accessToken: "token-123",
      userId: "user-1",
      createdAt: 1782691200000,
    });

    expect(readCredentials(homeDir)).toEqual({
      cloudUrl: "https://mimir.example.com",
      accessToken: "token-123",
      userId: "user-1",
      createdAt: 1782691200000,
    });

    if (process.platform !== "win32") {
      expect((statSync(credentialsPath(homeDir)).mode & 0o777).toString(8)).toBe("600");
    }
  });

  it("clears credentials and detects expiry", () => {
    const homeDir = mkdtempSync(join(tmpdir(), "mimir-auth-test-"));

    writeCredentials(homeDir, {
      cloudUrl: "https://mimir.example.com",
      accessToken: "token-123",
      expiresAt: Date.now() - 1,
      createdAt: Date.now(),
    });

    const credentials = readCredentials(homeDir);
    expect(credentials).not.toBeNull();
    expect(isExpired(credentials!)).toBe(true);
    expect(clearCredentials(homeDir)).toBe(true);
    expect(readCredentials(homeDir)).toBeNull();
  });

  it("keeps a stable local install identity separate from credentials", () => {
    const homeDir = mkdtempSync(join(tmpdir(), "mimir-install-test-"));

    const first = getOrCreateInstallIdentity(homeDir);
    const second = getOrCreateInstallIdentity(homeDir);

    expect(second).toEqual(first);
    expect(readInstallIdentity(homeDir)).toEqual(first);
    expect(first.installId).toMatch(/^install_/);

    clearCredentials(homeDir);
    expect(readInstallIdentity(homeDir)).toEqual(first);

    if (process.platform !== "win32") {
      expect((statSync(installIdentityPath(homeDir)).mode & 0o777).toString(8)).toBe("600");
    }
  });
});
