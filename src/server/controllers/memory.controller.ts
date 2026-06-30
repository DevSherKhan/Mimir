import type { FastifyReply, FastifyRequest } from "fastify";
import { uploadMemoryBatchDtoSchema, searchMemoriesQueryDtoSchema } from "../../cloud/dto/memory.dto.js";
import { authenticate, type ServerContext } from "../context.js";
import { searchCloudMemories } from "../services/search.service.js";

export async function uploadMemoryBatch(request: FastifyRequest, reply: FastifyReply, context: ServerContext) {
  const userId = await authenticate(request, context);
  if (!userId) {
    return reply.code(401).send({ error: "Valid bearer token is required" });
  }

  if (!context.cloudDatabase) {
    return reply.code(503).send({ error: "DATABASE_URL is not configured" });
  }

  const parsed = uploadMemoryBatchDtoSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Invalid upload payload" });
  }

  const acceptedContentHashes = await context.cloudDatabase.insertMemoryBatch(userId, parsed.data.chunks);
  return {
    accepted: acceptedContentHashes.length,
    acceptedContentHashes,
  };
}

export async function countMemories(request: FastifyRequest, reply: FastifyReply, context: ServerContext) {
  const userId = await authenticate(request, context);
  if (!userId) {
    return reply.code(401).send({ error: "Valid bearer token is required" });
  }

  if (!context.cloudDatabase) {
    return reply.code(503).send({ error: "DATABASE_URL is not configured" });
  }

  return {
    userId,
    count: await context.cloudDatabase.countMemories(userId),
  };
}

export async function searchMemories(request: FastifyRequest, reply: FastifyReply, context: ServerContext) {
  const userId = await authenticate(request, context);
  if (!userId) {
    return reply.code(401).send({ error: "Valid bearer token is required" });
  }

  if (!context.cloudDatabase) {
    return reply.code(503).send({ error: "DATABASE_URL is not configured" });
  }

  const parsed = searchMemoriesQueryDtoSchema.safeParse(request.query);
  if (!parsed.success) {
    return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Invalid search query" });
  }

  const query = parsed.data;
  return searchCloudMemories(context.cloudDatabase, userId, {
    query: query.query ?? query.q ?? "",
    limit: query.limit,
    sourceTool: query.sourceTool,
    sessionId: query.sessionId,
    workspacePath: query.workspacePath,
    since: query.since,
    until: query.until,
  });
}
