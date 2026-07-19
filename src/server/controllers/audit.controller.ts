import type { FastifyReply, FastifyRequest } from "fastify";
import { authenticate, type ServerContext } from "../context.js";
import { checkRateLimit } from "../utils/rate-limit.js";

export async function listAuditEvents(request: FastifyRequest, reply: FastifyReply, context: ServerContext) {
  if (!await checkRateLimit(request, reply, context, "audit.list", 30, 60_000)) {
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
    events: await context.cloudDatabase.listAuditEvents(userId, 50),
  };
}
