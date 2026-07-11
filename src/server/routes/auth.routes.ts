import type { FastifyInstance } from "fastify";
import {
  completeDeviceLogin,
  deleteInstallIdentity,
  logout,
  revokeAllTokens,
  startDeviceLogin,
} from "../controllers/auth.controller.js";
import type { ServerContext } from "../context.js";

export async function registerAuthRoutes(app: FastifyInstance, context: ServerContext): Promise<void> {
  app.post("/v1/auth/device/start", async (request, reply) => startDeviceLogin(request, reply, context));
  app.post("/v1/auth/device/complete", async (request, reply) => completeDeviceLogin(request, reply, context));
  app.post("/v1/auth/logout", async (request, reply) => logout(request, reply, context));
  app.post("/v1/auth/revoke-all", async (request, reply) => revokeAllTokens(request, reply, context));
  app.delete("/v1/install-identities/:installId", async (request, reply) => deleteInstallIdentity(request, reply, context));
}
