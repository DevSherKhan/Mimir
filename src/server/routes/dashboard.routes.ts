import fastifyStatic from "@fastify/static";
import type { FastifyInstance } from "fastify";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { ServerContext } from "../context.js";

const dashboardRoot = join(process.cwd(), "dist-dashboard");

export async function registerDashboardRoutes(app: FastifyInstance, _context: ServerContext): Promise<void> {
  if (!existsSync(dashboardRoot)) {
    app.get("/dashboard", async (_request, reply) => reply.code(503).send({
      error: "Dashboard assets are not built. Run npm run build:dashboard.",
    }));
    return;
  }

  await app.register(fastifyStatic, {
    root: dashboardRoot,
    prefix: "/dashboard/",
    decorateReply: true,
  });

  app.get("/dashboard", async (_request, reply) => reply.sendFile("index.html"));
}
