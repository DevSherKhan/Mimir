import { describe, expect, it } from "vitest";
import { getServerRuntimeConfig } from "../src/server/config.js";

describe("server runtime configuration", () => {
  it("uses safe local defaults", () => {
    expect(getServerRuntimeConfig({})).toEqual({ port: 3000, host: "0.0.0.0" });
  });

  it("accepts a configured host and port", () => {
    expect(getServerRuntimeConfig({ PORT: "8080", HOST: "127.0.0.1" })).toEqual({
      port: 8080,
      host: "127.0.0.1",
    });
  });

  it.each(["0", "65536", "abc", "3000.5"])("rejects invalid PORT=%s", (port) => {
    expect(() => getServerRuntimeConfig({ PORT: port })).toThrow("PORT must be an integer");
  });
});
