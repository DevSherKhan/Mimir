import type { CloudDatabase } from "../../cloud/db/types.js";
import { mcpSearchHistoricalChatsDtoSchema } from "../../cloud/dto/mcp.dto.js";
import type { FastifyReply, FastifyRequest } from "fastify";
import { authenticate, type ServerContext } from "../context.js";
import { isRecord } from "../utils/guards.js";
import { searchCloudMemories } from "../services/search.service.js";

export async function callMcp(request: FastifyRequest, reply: FastifyReply, context: ServerContext) {
  const userId = await authenticate(request, context);
  if (!userId) {
    return reply.code(401).send(jsonRpcError(null, -32001, "Valid bearer token is required"));
  }

  if (!context.cloudDatabase) {
    return reply.code(503).send(jsonRpcError(null, -32002, "DATABASE_URL is not configured"));
  }

  return handleMcpRequest(context.cloudDatabase, userId, isRecord(request.body) ? request.body : {});
}

export async function handleMcpRequest(database: CloudDatabase, userId: string, body: Record<string, unknown>): Promise<unknown> {
  const id = body.id ?? null;
  const method = typeof body.method === "string" ? body.method : "";

  if (method === "initialize") {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2025-06-18",
        capabilities: {
          tools: {},
        },
        serverInfo: {
          name: "mimir-cloud",
          version: "0.1.0",
        },
      },
    };
  }

  if (method === "notifications/initialized") {
    return {
      jsonrpc: "2.0",
      id,
      result: {},
    };
  }

  if (method === "tools/list") {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        tools: [{
          name: "search_historical_chats",
          description: "Search the authenticated user's uploaded AI chat memory.",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string" },
              limit: { type: "number", minimum: 1, maximum: 20 },
              sourceTool: { type: "string" },
              sessionId: { type: "string" },
              workspacePath: { type: "string" },
              since: { type: "string" },
              until: { type: "string" },
            },
            required: ["query"],
          },
        }],
      },
    };
  }

  if (method === "tools/call") {
    const params = isRecord(body.params) ? body.params : {};
    const name = typeof params.name === "string" ? params.name : "";
    const args = isRecord(params.arguments) ? params.arguments : {};

    if (name !== "search_historical_chats") {
      return jsonRpcError(id, -32602, `Unknown tool: ${name}`);
    }

    const parsed = mcpSearchHistoricalChatsDtoSchema.safeParse(args);
    if (!parsed.success) {
      return jsonRpcError(id, -32602, parsed.error.issues[0]?.message ?? "Invalid tool arguments");
    }

    const search = await searchCloudMemories(database, userId, parsed.data);
    return {
      jsonrpc: "2.0",
      id,
      result: {
        content: [{
          type: "text",
          text: JSON.stringify(search, null, 2),
        }],
        structuredContent: search,
      },
    };
  }

  return jsonRpcError(id, -32601, `Unsupported method: ${method}`);
}

export function jsonRpcError(id: unknown, code: number, message: string): unknown {
  return {
    jsonrpc: "2.0",
    id,
    error: {
      code,
      message,
    },
  };
}
