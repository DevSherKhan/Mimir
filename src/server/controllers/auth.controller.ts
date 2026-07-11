import type { FastifyReply, FastifyRequest } from "fastify";
import { completeDeviceLoginDtoSchema, startDeviceLoginDtoSchema } from "../../cloud/dto/auth.dto.js";
import { authenticate, baseUrl, bearerToken, type ServerContext } from "../context.js";
import { checkRateLimit } from "../utils/rate-limit.js";

export async function startDeviceLogin(request: FastifyRequest, reply: FastifyReply, context: ServerContext) {
  if (!checkRateLimit(request, reply, "auth.device.start", 20, 60_000)) {
    return reply;
  }

  if (!context.cloudDatabase) {
    return reply.code(503).send({ error: "DATABASE_URL is not configured" });
  }

  const parsed = startDeviceLoginDtoSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Invalid device login payload" });
  }

  return context.cloudDatabase.startDeviceLogin(baseUrl(request, context.port), parsed.data.installId, parsed.data.client);
}

export async function completeDeviceLogin(request: FastifyRequest, reply: FastifyReply, context: ServerContext) {
  if (!checkRateLimit(request, reply, "auth.device.complete", 60, 60_000)) {
    return reply;
  }

  if (!context.cloudDatabase) {
    return reply.code(503).send({ error: "DATABASE_URL is not configured" });
  }

  const parsed = completeDeviceLoginDtoSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "deviceCode is required" });
  }

  const completed = await context.cloudDatabase.completeDeviceLogin(parsed.data.deviceCode);
  if (!completed) {
    return reply.code(428).send({ error: "Authorization pending" });
  }

  return completed;
}

export async function logout(request: FastifyRequest, reply: FastifyReply, context: ServerContext) {
  if (!checkRateLimit(request, reply, "auth.logout", 20, 60_000)) {
    return reply;
  }

  if (!context.cloudDatabase) {
    return reply.code(503).send({ error: "DATABASE_URL is not configured" });
  }

  const userId = await authenticate(request, context);
  const token = bearerToken(request);
  if (!userId || !token) {
    return reply.code(401).send({ error: "Valid bearer token is required" });
  }

  await context.cloudDatabase.revokeBearerToken(token);
  await context.cloudDatabase.recordAuditEvent(userId, "auth.logout");
  return {
    revoked: true,
  };
}

export async function revokeAllTokens(request: FastifyRequest, reply: FastifyReply, context: ServerContext) {
  if (!checkRateLimit(request, reply, "auth.revoke_all", 5, 60_000)) {
    return reply;
  }

  if (!context.cloudDatabase) {
    return reply.code(503).send({ error: "DATABASE_URL is not configured" });
  }

  const userId = await authenticate(request, context);
  if (!userId) {
    return reply.code(401).send({ error: "Valid bearer token is required" });
  }

  const revoked = await context.cloudDatabase.revokeAllBearerTokens(userId);
  await context.cloudDatabase.recordAuditEvent(userId, "auth.revoke_all", { revoked });
  return { revoked };
}

export async function deleteInstallIdentity(request: FastifyRequest, reply: FastifyReply, context: ServerContext) {
  if (!checkRateLimit(request, reply, "auth.install.delete", 10, 60_000)) {
    return reply;
  }

  if (!context.cloudDatabase) {
    return reply.code(503).send({ error: "DATABASE_URL is not configured" });
  }

  const userId = await authenticate(request, context);
  if (!userId) {
    return reply.code(401).send({ error: "Valid bearer token is required" });
  }

  const params = request.params as { installId?: string };
  const installId = params.installId;
  if (!installId) {
    return reply.code(400).send({ error: "installId is required" });
  }

  const deleted = await context.cloudDatabase.deleteInstallIdentity(userId, installId);
  await context.cloudDatabase.recordAuditEvent(userId, "auth.install.delete", { installId, deleted });
  return { deleted };
}
