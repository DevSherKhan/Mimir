import type { FastifyReply, FastifyRequest } from "fastify";
import { bearerToken, type ServerContext } from "../context.js";

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export async function checkRateLimit(
  request: FastifyRequest,
  reply: FastifyReply,
  context: ServerContext,
  action: string,
  limit: number,
  windowMs: number,
): Promise<boolean> {
  const identifier = action.startsWith("auth.device")
    ? request.ip
    : bearerToken(request) ?? request.ip;
  const decision = context.cloudDatabase
    ? await context.cloudDatabase.consumeRateLimit(action, identifier, limit, windowMs)
    : consumeInMemory(action, identifier, limit, windowMs);

  if (!decision.allowed) {
    reply
      .code(429)
      .header("Retry-After", decision.retryAfterSeconds.toString())
      .send({ error: "Rate limit exceeded" });
    return false;
  }

  return true;
}

function consumeInMemory(action: string, identifier: string, limit: number, windowMs: number) {
  const now = Date.now();
  const key = `${action}:${identifier}`;
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return { allowed: true, retryAfterSeconds: Math.ceil(windowMs / 1000) };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  return {
    allowed: true,
    retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
  };
}
