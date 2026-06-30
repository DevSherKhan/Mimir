import type { FastifyInstance } from "fastify";
import { callMcp } from "../controllers/mcp.controller.js";
import type { ServerContext } from "../context.js";

export async function registerMcpRoutes(app: FastifyInstance, context: ServerContext): Promise<void> {
  app.post("/mcp", async (request, reply) => callMcp(request, reply, context));
}
