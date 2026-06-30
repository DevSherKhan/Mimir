import type { FastifyInstance } from "fastify";
import { countMemories, searchMemories, uploadMemoryBatch } from "../controllers/memory.controller.js";
import type { ServerContext } from "../context.js";

export async function registerMemoryRoutes(app: FastifyInstance, context: ServerContext): Promise<void> {
  app.post("/v1/memories/batch", async (request, reply) => uploadMemoryBatch(request, reply, context));
  app.get("/v1/memories/count", async (request, reply) => countMemories(request, reply, context));
  app.get("/v1/memories/search", async (request, reply) => searchMemories(request, reply, context));
}
