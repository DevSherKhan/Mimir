import type { ServerContext } from "../context.js";

export function healthResponse(context: ServerContext) {
  const databaseConfigured = Boolean(context.cloudDatabase);

  return {
    name: "mimir",
    status: databaseConfigured ? "ok" : "unavailable",
    database: databaseConfigured ? "configured" : "not_configured",
  };
}
