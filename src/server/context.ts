import type { FastifyRequest } from "fastify";
import type { CloudDatabase } from "../cloud/db/types.js";

export interface ServerContext {
  cloudDatabase: CloudDatabase | null;
  port: number;
}

export async function authenticate(request: FastifyRequest, context: ServerContext): Promise<string | null> {
  const auth = request.headers.authorization ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : null;
  return token && context.cloudDatabase ? context.cloudDatabase.userIdForBearerToken(token) : null;
}

export function baseUrl(request: FastifyRequest, fallbackPort: number): string {
  const forwardedProto = request.headers["x-forwarded-proto"];
  const proto = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto;
  const scheme = proto ?? (process.env.NODE_ENV === "production" ? "https" : "http");
  const forwardedHost = request.headers["x-forwarded-host"];
  const hostHeader = forwardedHost ?? request.headers.host ?? `localhost:${fallbackPort}`;
  const hostname = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;
  return `${scheme}://${hostname}`;
}
