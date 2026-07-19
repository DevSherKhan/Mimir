import formBody from "@fastify/formbody";
import Fastify from "fastify";
import { createCloudDatabase } from "../cloud/db/database.js";
import type { ServerContext } from "./context.js";
import { registerAuthRoutes } from "./routes/auth.routes.js";
import { registerAuditRoutes } from "./routes/audit.routes.js";
import { registerDashboardRoutes } from "./routes/dashboard.routes.js";
import { registerDeviceRoutes } from "./routes/device.routes.js";
import { registerDocsRoutes } from "./routes/docs.routes.js";
import { registerHealthRoutes } from "./routes/health.routes.js";
import { registerMcpRoutes } from "./routes/mcp.routes.js";
import { registerMemoryRoutes } from "./routes/memory.routes.js";

export async function buildServer(port: number) {
  const app = Fastify({
    logger: true,
    trustProxy: process.env.NODE_ENV === "production" ? 1 : false,
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
  await registerDocsRoutes(app);
  await registerAuditRoutes(app, context);
  await registerAuthRoutes(app, context);
  await registerDeviceRoutes(app, context);
  await registerMemoryRoutes(app, context);
  await registerMcpRoutes(app, context);
  await registerDashboardRoutes(app, context);

  app.setErrorHandler((error, request, reply) => {
    const errorStatusCode = typeof error === "object"
      && error !== null
      && "statusCode" in error
      && typeof error.statusCode === "number"
      ? error.statusCode
      : undefined;
    const statusCode = errorStatusCode !== undefined
      ? Math.max(400, Math.min(599, errorStatusCode))
      : 500;
    if (statusCode >= 500) {
      request.log.error({ err: error }, "Request failed");
    }
    const internalMessage = error instanceof Error ? error.message : "Unexpected server error";
    const message = statusCode >= 500 && process.env.NODE_ENV === "production"
      ? "Internal server error"
      : internalMessage;
    reply.code(statusCode).send({ error: message, requestId: request.id });
  });

  return app;
}
