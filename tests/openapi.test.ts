import { afterEach, describe, expect, it, vi } from "vitest";
import { buildServer } from "../src/server/app.js";
import { openApiDocument } from "../src/server/openapi/document.js";

describe("OpenAPI and Swagger documentation", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("documents every public JSON API route and serves a CSP-safe Swagger UI", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("MIMIR_DOCS_ENABLED", "true");
    const app = await buildServer(3000);

    const documentResponse = await app.inject({ method: "GET", url: "/openapi.json" });
    expect(documentResponse.statusCode).toBe(200);
    expect(documentResponse.headers["content-type"]).toContain("application/json");
    expect(documentResponse.json()).toMatchObject({
      openapi: "3.1.0",
      info: { title: "Mimir Cloud API" },
    });

    const documentedPaths = Object.keys(openApiDocument.paths).sort();
    expect(documentedPaths).toEqual([
      "/",
      "/health",
      "/mcp",
      "/v1/audit-logs",
      "/v1/auth/device/complete",
      "/v1/auth/device/start",
      "/v1/auth/logout",
      "/v1/auth/revoke-all",
      "/v1/conversations",
      "/v1/conversations/{sessionId}",
      "/v1/dashboard",
      "/v1/install-identities/{installId}",
      "/v1/memories",
      "/v1/memories/batch",
      "/v1/memories/browse",
      "/v1/memories/count",
      "/v1/memories/export",
      "/v1/memories/search",
    ]);

    const html = await app.inject({ method: "GET", url: "/docs/" });
    expect(html.statusCode).toBe(200);
    expect(html.body).toContain("/docs/swagger-ui-bundle.js");
    expect(html.body).toContain("/docs/swagger-initializer.js");
    expect(html.body).not.toMatch(/<script>[^<]/u);

    const initializer = await app.inject({ method: "GET", url: "/docs/swagger-initializer.js" });
    expect(initializer.statusCode).toBe(200);
    expect(initializer.headers["content-type"]).toContain("application/javascript");
    expect(initializer.body).toContain('url: "/openapi.json"');

    const stylesheet = await app.inject({ method: "GET", url: "/docs/swagger-ui.css" });
    expect(stylesheet.statusCode).toBe(200);
    expect(stylesheet.headers["content-type"]).toContain("text/css");
    await app.close();
  });

  it("can remove documentation routes from a deployment", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("MIMIR_DOCS_ENABLED", " FALSE ");
    const app = await buildServer(3000);

    expect((await app.inject({ method: "GET", url: "/docs/" })).statusCode).toBe(404);
    expect((await app.inject({ method: "GET", url: "/openapi.json" })).statusCode).toBe(404);
    await app.close();
  });
});
