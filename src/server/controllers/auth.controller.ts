import type { FastifyReply, FastifyRequest } from "fastify";
import { completeDeviceLoginDtoSchema, startDeviceLoginDtoSchema } from "../../cloud/dto/auth.dto.js";
import { baseUrl, type ServerContext } from "../context.js";

export async function startDeviceLogin(request: FastifyRequest, reply: FastifyReply, context: ServerContext) {
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
