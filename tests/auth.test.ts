import { mkdtempSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { clearCredentials, credentialsPath, isExpired, readCredentials, writeCredentials } from "../src/auth.js";

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
});
