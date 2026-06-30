import formBody from "@fastify/formbody";
import Fastify from "fastify";
import { createCloudDatabase } from "../cloud/db/database.js";
import type { ServerContext } from "./context.js";
import { registerAuthRoutes } from "./routes/auth.routes.js";
import { registerDeviceRoutes } from "./routes/device.routes.js";
import { registerHealthRoutes } from "./routes/health.routes.js";
import { registerMcpRoutes } from "./routes/mcp.routes.js";
import { registerMemoryRoutes } from "./routes/memory.routes.js";

export async function buildServer(port: number) {
  const app = Fastify({
    logger: true,
  });

  await app.register(formBody);

  const context: ServerContext = {
    cloudDatabase: await createCloudDatabase(),
    port,
  };

  await registerHealthRoutes(app, context);
  await registerAuthRoutes(app, context);
  await registerDeviceRoutes(app, context);
  await registerMemoryRoutes(app, context);
  await registerMcpRoutes(app, context);

  app.setErrorHandler((error, _request, reply) => {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    reply.code(500).send({ error: message });
  });

  return app;
}
