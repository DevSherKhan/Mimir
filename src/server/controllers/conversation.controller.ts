import type { FastifyReply, FastifyRequest } from "fastify";
import { conversationDetailQueryDtoSchema, conversationListQueryDtoSchema } from "../../cloud/dto/memory.dto.js";
import { authenticate, type ServerContext } from "../context.js";
import {
  ConversationCursorError,
  listConversationEntryPage,
  listConversationPage,
} from "../services/conversation.service.js";
import { checkRateLimit } from "../utils/rate-limit.js";

export async function listConversations(request: FastifyRequest, reply: FastifyReply, context: ServerContext) {
  if (!await checkRateLimit(request, reply, context, "conversations.list", 120, 60_000)) {
    return reply;
  }
  const userId = await authenticate(request, context);
  if (!userId) {
    return reply.code(401).send({ error: "Valid bearer token is required" });
  }
  if (!context.cloudDatabase) {
    return reply.code(503).send({ error: "DATABASE_URL is not configured" });
  }

  const parsed = conversationListQueryDtoSchema.safeParse(request.query);
  if (!parsed.success) {
    return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Invalid conversation filters" });
  }
  try {
    return await listConversationPage(context.cloudDatabase, userId, parsed.data);
  } catch (error) {
    if (error instanceof ConversationCursorError) {
      return reply.code(400).send({ error: error.message });
    }
    throw error;
  }
}

export async function getConversation(request: FastifyRequest, reply: FastifyReply, context: ServerContext) {
  if (!await checkRateLimit(request, reply, context, "conversations.detail", 180, 60_000)) {
    return reply;
  }
  const userId = await authenticate(request, context);
  if (!userId) {
    return reply.code(401).send({ error: "Valid bearer token is required" });
  }
  if (!context.cloudDatabase) {
    return reply.code(503).send({ error: "DATABASE_URL is not configured" });
  }

  const params = request.params as { sessionId?: string };
  const sessionId = params.sessionId?.trim();
  if (!sessionId) {
    return reply.code(400).send({ error: "sessionId is required" });
  }
  const parsed = conversationDetailQueryDtoSchema.safeParse(request.query);
  if (!parsed.success) {
    return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Invalid conversation request" });
  }
  try {
    const result = await listConversationEntryPage(context.cloudDatabase, userId, sessionId, parsed.data);
    if (result.entries.length === 0 && !parsed.data.cursor) {
      return reply.code(404).send({ error: "Conversation not found" });
    }
    return result;
  } catch (error) {
    if (error instanceof ConversationCursorError) {
      return reply.code(400).send({ error: error.message });
    }
    throw error;
  }
}
