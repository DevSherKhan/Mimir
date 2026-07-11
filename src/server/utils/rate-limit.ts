import type { FastifyReply, FastifyRequest } from "fastify";
import { bearerToken } from "../context.js";

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export function checkRateLimit(
  request: FastifyRequest,
  reply: FastifyReply,
  action: string,
  limit: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const key = `${action}:${bearerToken(request) ?? request.ip}`;
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return true;
  }

  if (current.count >= limit) {
    reply
      .code(429)
      .header("Retry-After", Math.ceil((current.resetAt - now) / 1000).toString())
      .send({ error: "Rate limit exceeded" });
    return false;
  }

  current.count += 1;
  return true;
}
