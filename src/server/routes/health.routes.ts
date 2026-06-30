import type { FastifyInstance } from "fastify";
import { healthResponse } from "../controllers/health.controller.js";
import type { ServerContext } from "../context.js";

export async function registerHealthRoutes(app: FastifyInstance, context: ServerContext): Promise<void> {
  app.get("/", async () => healthResponse(context));
  app.get("/health", async () => healthResponse(context));
}
