import type { FastifyReply, FastifyRequest } from "fastify";
import { approveDeviceLoginDtoSchema } from "../../cloud/dto/auth.dto.js";
import type { ServerContext } from "../context.js";
import { authCookie } from "../utils/auth-cookie.js";
import { isRecord } from "../utils/guards.js";
import { deviceApprovalHtml, pageHtml } from "../views/pages.js";
import { checkRateLimit } from "../utils/rate-limit.js";

export function showDeviceApproval(request: FastifyRequest, reply: FastifyReply) {
  const query = request.query;
  const code = isRecord(query) && typeof query.code === "string" ? query.code : "";
  return sendHtml(reply, 200, deviceApprovalHtml(code));
}

export async function approveDeviceLogin(request: FastifyRequest, reply: FastifyReply, context: ServerContext) {
  if (!await checkRateLimit(request, reply, context, "auth.device.approve", 10, 60_000)) {
    return reply;
  }

  if (!context.cloudDatabase) {
    return sendHtml(reply, 503, pageHtml("Mimir Login", "DATABASE_URL is not configured."));
  }

  const parsed = approveDeviceLoginDtoSchema.safeParse(request.body);
  if (!parsed.success) {
    return sendHtml(reply, 400, pageHtml("Mimir Login Failed", parsed.error.issues[0]?.message ?? "code is required"));
  }

  try {
    const approval = await context.cloudDatabase.approveDeviceLogin(parsed.data.code);
    const browserSession = await context.cloudDatabase.createBearerToken(approval.userId);
    await context.cloudDatabase.recordAuditEvent(approval.userId, "auth.browser_login");
    return sendHtml(
      reply.header("Set-Cookie", authCookie(browserSession.accessToken, request)),
      200,
      pageHtml("Mimir Login Approved", `
        <p class="lead">Your CLI and this browser are now connected to the same Mimir account.</p>
        <a class="button" href="/dashboard">Open memory dashboard</a>
        <p class="muted">You can also return to your terminal; it will finish signing in automatically.</p>
      `),
    );
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
