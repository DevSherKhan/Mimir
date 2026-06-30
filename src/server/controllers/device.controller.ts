import type { FastifyReply, FastifyRequest } from "fastify";
import { approveDeviceLoginDtoSchema } from "../../cloud/dto/auth.dto.js";
import type { ServerContext } from "../context.js";
import { isRecord } from "../utils/guards.js";
import { deviceApprovalHtml, pageHtml } from "../views/pages.js";

export function showDeviceApproval(request: FastifyRequest, reply: FastifyReply) {
  const query = request.query;
  const code = isRecord(query) && typeof query.code === "string" ? query.code : "";
  return sendHtml(reply, 200, deviceApprovalHtml(code));
}

export async function approveDeviceLogin(request: FastifyRequest, reply: FastifyReply, context: ServerContext) {
  if (!context.cloudDatabase) {
    return sendHtml(reply, 503, pageHtml("Mimir Login", "DATABASE_URL is not configured."));
  }

  const parsed = approveDeviceLoginDtoSchema.safeParse(request.body);
  if (!parsed.success) {
    return sendHtml(reply, 400, pageHtml("Mimir Login Failed", parsed.error.issues[0]?.message ?? "code is required"));
  }

  try {
    await context.cloudDatabase.approveDeviceLogin(parsed.data.code);
    return sendHtml(reply, 200, pageHtml("Mimir Login Approved", "You can return to your terminal now."));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not approve login.";
    return sendHtml(reply, 400, pageHtml("Mimir Login Failed", message));
  }
}

function sendHtml(reply: FastifyReply, status: number, body: string) {
  return reply
    .code(status)
    .type("text/html; charset=utf-8")
    .send(body);
}
