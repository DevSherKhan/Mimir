import { describe, expect, it } from "vitest";
import { redactSecrets } from "../src/security/redact.js";

describe("redactSecrets", () => {
  it("redacts common token and email patterns", () => {
    const redacted = redactSecrets("email me@test.com token=supersecretvalue123 ghp_abcdefghijklmnopqrstuvwxyz");

    expect(redacted).not.toContain("me@test.com");
    expect(redacted).not.toContain("supersecretvalue123");
    expect(redacted).not.toContain("ghp_abcdefghijklmnopqrstuvwxyz");
    expect(redacted).toContain("[REDACTED_EMAIL]");
  });
});
