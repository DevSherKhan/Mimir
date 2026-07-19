import formBody from "@fastify/formbody";
import Fastify from "fastify";
import { createCloudDatabase } from "../cloud/db/database.js";
import type { ServerContext } from "./context.js";
import { registerAuthRoutes } from "./routes/auth.routes.js";
import { registerAuditRoutes } from "./routes/audit.routes.js";
import { registerDashboardRoutes } from "./routes/dashboard.routes.js";
import { registerDeviceRoutes } from "./routes/device.routes.js";
import { registerHealthRoutes } from "./routes/health.routes.js";
import { registerMcpRoutes } from "./routes/mcp.routes.js";
import { registerMemoryRoutes } from "./routes/memory.routes.js";

export async function buildServer(port: number) {
  const app = Fastify({
    logger: true,
    trustProxy: process.env.NODE_ENV === "production",
    bodyLimit: 10 * 1024 * 1024,
    requestTimeout: 60_000,
  });

  await app.register(formBody);

  const context: ServerContext = {
    cloudDatabase: await createCloudDatabase(),
    port,
  };

  app.addHook("onSend", async (_request, reply) => {
    reply
      .header("X-Content-Type-Options", "nosniff")
      .header("X-Frame-Options", "DENY")
      .header("Referrer-Policy", "no-referrer")
      .header("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
      .header(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
      );

    if (process.env.NODE_ENV === "production") {
      reply.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }
  });

  app.addHook("onClose", async () => {
    await context.cloudDatabase?.close();
  });

  await registerHealthRoutes(app, context);
  await registerAuditRoutes(app, context);
  await registerAuthRoutes(app, context);
  await registerDeviceRoutes(app, context);
  await registerMemoryRoutes(app, context);
  await registerMcpRoutes(app, context);
  await registerDashboardRoutes(app, context);

  app.setErrorHandler((error, _request, reply) => {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    reply.code(500).send({ error: message });
  });

  return app;
}
