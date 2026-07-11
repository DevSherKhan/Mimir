import { afterEach, describe, expect, it, vi } from "vitest";
import { createCloudClient } from "../src/cloud/client/cloud-client.js";

describe("cloud client auth", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls cloud logout with bearer auth", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ revoked: true }),
    } as Response);

    const client = createCloudClient("https://mimir.example.com");

    await expect(client.logout("token-123")).resolves.toEqual({ revoked: true });
    expect(fetchMock).toHaveBeenCalledWith("https://mimir.example.com/v1/auth/logout", expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({
        Authorization: "Bearer token-123",
      }),
    }));
  });

  it("calls hosted MCP with bearer auth", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({
        jsonrpc: "2.0",
        id: "tools",
        result: { tools: [] },
      }),
    } as Response);

    const client = createCloudClient("https://mimir.example.com");
    const body = {
      jsonrpc: "2.0",
      id: "tools",
      method: "tools/list",
      params: {},
    };

    await expect(client.callMcp(body, "token-123")).resolves.toMatchObject({
      jsonrpc: "2.0",
      id: "tools",
    });
    expect(fetchMock).toHaveBeenCalledWith("https://mimir.example.com/mcp", expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({
        Authorization: "Bearer token-123",
      }),
      body: JSON.stringify(body),
    }));
  });
});
