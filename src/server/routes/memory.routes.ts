import type { FastifyInstance } from "fastify";
import { getConversation, listConversations } from "../controllers/conversation.controller.js";
import {
  browseMemories,
  countMemories,
  dashboardSummary,
  deleteMemories,
  exportMemories,
  searchMemories,
  uploadMemoryBatch,
} from "../controllers/memory.controller.js";
import type { ServerContext } from "../context.js";

export async function registerMemoryRoutes(app: FastifyInstance, context: ServerContext): Promise<void> {
  app.post("/v1/memories/batch", async (request, reply) => uploadMemoryBatch(request, reply, context));
  app.get("/v1/memories/count", async (request, reply) => countMemories(request, reply, context));
  app.get("/v1/memories/export", async (request, reply) => exportMemories(request, reply, context));
  app.get("/v1/memories/browse", async (request, reply) => browseMemories(request, reply, context));
  app.get("/v1/memories/search", async (request, reply) => searchMemories(request, reply, context));
  app.delete("/v1/memories", async (request, reply) => deleteMemories(request, reply, context));
  app.get("/v1/dashboard", async (request, reply) => dashboardSummary(request, reply, context));
  app.get("/v1/conversations", async (request, reply) => listConversations(request, reply, context));
  app.get("/v1/conversations/:sessionId", async (request, reply) => getConversation(request, reply, context));
}
