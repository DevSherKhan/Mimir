import type { FastifyInstance } from "fastify";
import { approveDeviceLogin, showDeviceApproval } from "../controllers/device.controller.js";
import type { ServerContext } from "../context.js";

export async function registerDeviceRoutes(app: FastifyInstance, context: ServerContext): Promise<void> {
  app.get("/device", async (request, reply) => showDeviceApproval(request, reply));
  app.post("/device/approve", async (request, reply) => approveDeviceLogin(request, reply, context));
}
