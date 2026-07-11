import { describe, expect, it } from "vitest";
import { userIdForDevToken } from "../src/cloud/db/database.js";
import { bearerToken } from "../src/server/context.js";

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

  it("extracts bearer tokens from requests", () => {
    expect(bearerToken({
      headers: {
        authorization: "Bearer token-123",
      },
    } as never)).toBe("token-123");
    expect(bearerToken({
      headers: {
        authorization: "token-123",
      },
    } as never)).toBeNull();
  });
});
