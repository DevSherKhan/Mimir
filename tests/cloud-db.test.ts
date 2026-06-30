import { describe, expect, it } from "vitest";
import { userIdForBearerToken, userIdForToken } from "../src/cloud-db.js";

describe("cloud auth helpers", () => {
  it("maps the configured dev token to the configured user id", () => {
    expect(userIdForToken("secret-token", {
      MIMIR_DEV_ACCESS_TOKEN: "secret-token",
      MIMIR_DEV_USER_ID: "user-123",
    })).toBe("user-123");
  });

  it("rejects unknown tokens", () => {
    expect(userIdForToken("wrong-token", {
      MIMIR_DEV_ACCESS_TOKEN: "secret-token",
      MIMIR_DEV_USER_ID: "user-123",
    })).toBeNull();
  });

  it("keeps dev-token compatibility for early deployments", async () => {
    await expect(userIdForBearerToken("secret-token", null, {
      MIMIR_DEV_ACCESS_TOKEN: "secret-token",
      MIMIR_DEV_USER_ID: "user-123",
    })).resolves.toBe("user-123");
  });
});
