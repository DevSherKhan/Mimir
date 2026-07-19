import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import type { CloudDatabase } from "../src/cloud/db/types.js";
import { registerHealthRoutes } from "../src/server/routes/health.routes.js";

describe("server health", () => {
  it("returns 503 when the cloud database is not configured", async () => {
    const app = Fastify();
    await registerHealthRoutes(app, {
      cloudDatabase: null,
      port: 3000,
    });

    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({
      status: "unavailable",
      database: "not_configured",
    });
    await app.close();
  });

  it("returns 200 when the cloud database is configured", async () => {
    const app = Fastify();
    await registerHealthRoutes(app, {
      cloudDatabase: {} as CloudDatabase,
      port: 3000,
    });

    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: "ok",
      database: "configured",
    });
    await app.close();
  });
});
