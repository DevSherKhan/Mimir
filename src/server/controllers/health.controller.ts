import type { ServerContext } from "../context.js";

export function healthResponse(context: ServerContext) {
  return {
    name: "mimir",
    status: "ok",
    database: context.cloudDatabase ? "configured" : "not_configured",
  };
}
