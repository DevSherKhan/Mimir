import type { FastifyReply, FastifyRequest } from "fastify";
import { DeviceLoginStateError } from "../../cloud/db/types.js";
import { completeDeviceLoginDtoSchema, startDeviceLoginDtoSchema } from "../../cloud/dto/auth.dto.js";
import { authenticate, baseUrl, bearerToken, type ServerContext } from "../context.js";
import { checkRateLimit } from "../utils/rate-limit.js";
import { clearAuthCookie } from "../utils/auth-cookie.js";

export async function startDeviceLogin(request: FastifyRequest, reply: FastifyReply, context: ServerContext) {
  if (!await checkRateLimit(request, reply, context, "auth.device.start", 20, 60_000)) {
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
  if (!await checkRateLimit(request, reply, context, "auth.device.complete", 60, 60_000)) {
    return reply;
  }

  if (!context.cloudDatabase) {
    return reply.code(503).send({ error: "DATABASE_URL is not configured" });
  }

  const parsed = completeDeviceLoginDtoSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "deviceCode is required" });
  }

  try {
    const completed = await context.cloudDatabase.completeDeviceLogin(parsed.data.deviceCode);
    if (!completed) {
      return reply.code(428).send({ error: "Authorization pending. Approve the login code in your browser." });
    }

    await context.cloudDatabase.recordAuditEvent(completed.userId, "auth.cli_login");
    return completed;
  } catch (error) {
    if (error instanceof DeviceLoginStateError) {
      return reply.code(error.statusCode).send({ error: error.message });
    }
    throw error;
  }
}

export async function logout(request: FastifyRequest, reply: FastifyReply, context: ServerContext) {
  if (!await checkRateLimit(request, reply, context, "auth.logout", 20, 60_000)) {
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
  return reply.header("Set-Cookie", clearAuthCookie(request)).send({
    revoked: true,
  });
}

export async function revokeAllTokens(request: FastifyRequest, reply: FastifyReply, context: ServerContext) {
  if (!await checkRateLimit(request, reply, context, "auth.revoke_all", 5, 60_000)) {
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
  return reply.header("Set-Cookie", clearAuthCookie(request)).send({ revoked });
}

export async function deleteInstallIdentity(request: FastifyRequest, reply: FastifyReply, context: ServerContext) {
  if (!await checkRateLimit(request, reply, context, "auth.install.delete", 10, 60_000)) {
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
