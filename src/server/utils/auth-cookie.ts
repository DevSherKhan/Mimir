import type { FastifyRequest } from "fastify";

export const AUTH_COOKIE_NAME = "mimir_session";

export function authCookie(accessToken: string, request: FastifyRequest): string {
  return [
    `${AUTH_COOKIE_NAME}=${encodeURIComponent(accessToken)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=2592000",
    isSecureRequest(request) ? "Secure" : "",
  ].filter(Boolean).join("; ");
}

export function clearAuthCookie(request: FastifyRequest): string {
  return [
    `${AUTH_COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
    isSecureRequest(request) ? "Secure" : "",
  ].filter(Boolean).join("; ");
}

export function cookieValue(header: string | undefined, name: string): string | null {
  if (!header) {
    return null;
  }

  for (const part of header.split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (rawName === name) {
      try {
        return decodeURIComponent(rawValue.join("="));
      } catch {
        return null;
      }
    }
  }

  return null;
}

function isSecureRequest(request: FastifyRequest): boolean {
  const forwardedProto = request.headers["x-forwarded-proto"];
  const proto = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto;
  return proto === "https" || request.protocol === "https";
}
