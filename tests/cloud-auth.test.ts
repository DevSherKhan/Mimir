import { describe, expect, it } from "vitest";
import { userIdForDevToken } from "../src/cloud/db/database.js";

describe("cloud auth helpers", () => {
  it("maps the configured dev token to the configured user id", () => {
    expect(userIdForDevToken("secret-token", {
      MIMIR_DEV_ACCESS_TOKEN: "secret-token",
      MIMIR_DEV_USER_ID: "user-123",
    })).toBe("user-123");
  });

  it("rejects unknown tokens", () => {
    expect(userIdForDevToken("wrong-token", {
      MIMIR_DEV_ACCESS_TOKEN: "secret-token",
      MIMIR_DEV_USER_ID: "user-123",
    })).toBeNull();
  });
});
