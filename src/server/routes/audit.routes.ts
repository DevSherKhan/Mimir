import type { FastifyInstance } from "fastify";
import { listAuditEvents } from "../controllers/audit.controller.js";
import type { ServerContext } from "../context.js";

export async function registerAuditRoutes(app: FastifyInstance, context: ServerContext): Promise<void> {
  app.get("/v1/audit-logs", async (request, reply) => listAuditEvents(request, reply, context));
}
