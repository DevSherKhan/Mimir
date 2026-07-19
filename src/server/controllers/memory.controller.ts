import type { FastifyReply, FastifyRequest } from "fastify";
import { uploadMemoryBatchDtoSchema, searchMemoriesQueryDtoSchema } from "../../cloud/dto/memory.dto.js";
import { authenticate, type ServerContext } from "../context.js";
import { browseCloudMemories, searchCloudMemories } from "../services/search.service.js";
import { checkRateLimit } from "../utils/rate-limit.js";
import { sha256 } from "../../core/hash.js";

export async function uploadMemoryBatch(request: FastifyRequest, reply: FastifyReply, context: ServerContext) {
  if (!await checkRateLimit(request, reply, context, "memories.upload", 30, 60_000)) {
    return reply;
  }

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
  await context.cloudDatabase.recordAuditEvent(userId, "memories.upload", {
    requested: parsed.data.chunks.length,
    accepted: acceptedContentHashes.length,
  });
  return {
    accepted: acceptedContentHashes.length,
    acceptedContentHashes,
  };
}

export async function countMemories(request: FastifyRequest, reply: FastifyReply, context: ServerContext) {
  if (!await checkRateLimit(request, reply, context, "memories.count", 120, 60_000)) {
    return reply;
  }

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

export async function exportMemories(request: FastifyRequest, reply: FastifyReply, context: ServerContext) {
  if (!await checkRateLimit(request, reply, context, "memories.export", 10, 60_000)) {
    return reply;
  }

  const userId = await authenticate(request, context);
  if (!userId) {
    return reply.code(401).send({ error: "Valid bearer token is required" });
  }

  if (!context.cloudDatabase) {
    return reply.code(503).send({ error: "DATABASE_URL is not configured" });
  }

  const memories = await context.cloudDatabase.exportMemories(userId);
  await context.cloudDatabase.recordAuditEvent(userId, "memories.export", { count: memories.length });
  return reply
    .header("Content-Disposition", "attachment; filename=\"mimir-memory-export.json\"")
    .send({
      userId,
      exportedAt: new Date().toISOString(),
      memories,
    });
}

export async function deleteMemories(request: FastifyRequest, reply: FastifyReply, context: ServerContext) {
  if (!await checkRateLimit(request, reply, context, "memories.delete", 5, 60_000)) {
    return reply;
  }

  const userId = await authenticate(request, context);
  if (!userId) {
    return reply.code(401).send({ error: "Valid bearer token is required" });
  }

  if (!context.cloudDatabase) {
    return reply.code(503).send({ error: "DATABASE_URL is not configured" });
  }

  const deleted = await context.cloudDatabase.deleteMemories(userId);
  await context.cloudDatabase.recordAuditEvent(userId, "memories.delete", { deleted });
  return {
    deleted,
  };
}

export async function dashboardSummary(request: FastifyRequest, reply: FastifyReply, context: ServerContext) {
  if (!await checkRateLimit(request, reply, context, "dashboard.summary", 60, 60_000)) {
    return reply;
  }

  const userId = await authenticate(request, context);
  if (!userId) {
    return reply.code(401).send({ error: "Valid bearer token is required" });
  }

  if (!context.cloudDatabase) {
    return reply.code(503).send({ error: "DATABASE_URL is not configured" });
  }

  return context.cloudDatabase.getDashboardSummary(userId);
}

export async function searchMemories(request: FastifyRequest, reply: FastifyReply, context: ServerContext) {
  if (!await checkRateLimit(request, reply, context, "memories.search", 60, 60_000)) {
    return reply;
  }

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
  const result = await searchCloudMemories(context.cloudDatabase, userId, {
    query: query.query ?? query.q ?? "",
    limit: query.limit,
    sourceTool: query.sourceTool,
    sessionId: query.sessionId,
    workspacePath: query.workspacePath,
    role: query.role,
    since: query.since,
    until: query.until,
  });
  await context.cloudDatabase.recordAuditEvent(userId, "memories.search", {
    queryHash: sha256(query.query ?? query.q ?? ""),
    resultCount: Array.isArray(result.results) ? result.results.length : undefined,
  });
  return result;
}

export async function browseMemories(request: FastifyRequest, reply: FastifyReply, context: ServerContext) {
  if (!await checkRateLimit(request, reply, context, "memories.browse", 120, 60_000)) {
    return reply;
  }

  const userId = await authenticate(request, context);
  if (!userId) {
    return reply.code(401).send({ error: "Valid bearer token is required" });
  }

  if (!context.cloudDatabase) {
    return reply.code(503).send({ error: "DATABASE_URL is not configured" });
  }

  const parsed = searchMemoriesQueryDtoSchema.safeParse(request.query);
  if (!parsed.success) {
    return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Invalid memory filters" });
  }

  const filters = parsed.data;
  const result = await browseCloudMemories(context.cloudDatabase, userId, {
    limit: filters.limit,
    sourceTool: filters.sourceTool,
    sessionId: filters.sessionId,
    workspacePath: filters.workspacePath,
    role: filters.role,
    since: filters.since,
    until: filters.until,
  });
  await context.cloudDatabase.recordAuditEvent(userId, "memories.browse", {
    resultCount: result.resultCount,
    filteredBySource: Boolean(filters.sourceTool),
    filteredBySession: Boolean(filters.sessionId),
    filteredByWorkspace: Boolean(filters.workspacePath),
  });
  return result;
}
