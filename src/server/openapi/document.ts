import { MIMIR_VERSION } from "../../version.js";

const errorResponse = {
  description: "Request failed",
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/Error" },
    },
  },
} as const;

const authenticated = [{ bearerAuth: [] }, { cookieAuth: [] }];

export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "Mimir Cloud API",
    version: MIMIR_VERSION,
    description: "Authenticated API for uploading, browsing, searching, exporting, and deleting sanitized AI conversation memory.",
    license: {
      name: "ISC",
      identifier: "ISC",
    },
  },
  externalDocs: {
    description: "Mimir project documentation",
    url: "https://github.com/DevSherKhan/Mimir",
  },
  servers: [{ url: "/", description: "Current Mimir deployment" }],
  tags: [
    { name: "System", description: "Service health and readiness" },
    { name: "Authentication", description: "Device authorization and token lifecycle" },
    { name: "Memories", description: "Sanitized cloud memory operations" },
    { name: "Conversations", description: "Conversation summaries and chronological entries" },
    { name: "Audit", description: "Authenticated security activity" },
    { name: "MCP", description: "Model Context Protocol endpoint" },
  ],
  paths: {
    "/": {
      get: {
        operationId: "getServiceStatus",
        summary: "Read basic service status",
        tags: ["System"],
        responses: {
          "200": jsonResponse("Service status", { $ref: "#/components/schemas/Health" }),
        },
      },
    },
    "/health": {
      get: {
        operationId: "getHealth",
        summary: "Check service readiness",
        tags: ["System"],
        responses: {
          "200": jsonResponse("Service and database are ready", { $ref: "#/components/schemas/Health" }),
          "503": jsonResponse("Database is not configured", { $ref: "#/components/schemas/Health" }),
        },
      },
    },
    "/v1/auth/device/start": {
      post: {
        operationId: "startDeviceLogin",
        summary: "Start CLI device authorization",
        tags: ["Authentication"],
        requestBody: jsonBody({ $ref: "#/components/schemas/DeviceLoginStartRequest" }),
        responses: {
          "200": jsonResponse("Device authorization started", { $ref: "#/components/schemas/DeviceLoginStart" }),
          "400": errorResponse,
          "429": errorResponse,
          "503": errorResponse,
        },
      },
    },
    "/v1/auth/device/complete": {
      post: {
        operationId: "completeDeviceLogin",
        summary: "Exchange an approved device code for a token",
        tags: ["Authentication"],
        requestBody: jsonBody({ $ref: "#/components/schemas/DeviceLoginCompleteRequest" }),
        responses: {
          "200": jsonResponse("Device login completed", { $ref: "#/components/schemas/DeviceLoginComplete" }),
          "400": errorResponse,
          "409": errorResponse,
          "410": errorResponse,
          "428": errorResponse,
          "429": errorResponse,
          "503": errorResponse,
        },
      },
    },
    "/v1/auth/logout": {
      post: {
        operationId: "logout",
        summary: "Revoke the current bearer token",
        tags: ["Authentication"],
        security: authenticated,
        responses: standardAuthenticatedResponses("Current token revoked", { $ref: "#/components/schemas/RevokeResult" }),
      },
    },
    "/v1/auth/revoke-all": {
      post: {
        operationId: "revokeAllTokens",
        summary: "Revoke every token for the current user",
        tags: ["Authentication"],
        security: authenticated,
        responses: standardAuthenticatedResponses("Tokens revoked", { $ref: "#/components/schemas/RevokeCount" }),
      },
    },
    "/v1/install-identities/{installId}": {
      delete: {
        operationId: "deleteInstallIdentity",
        summary: "Remove a connected install identity",
        tags: ["Authentication"],
        security: authenticated,
        parameters: [{ $ref: "#/components/parameters/InstallId" }],
        responses: standardAuthenticatedResponses("Install identity removed", { $ref: "#/components/schemas/DeleteResult" }),
      },
    },
    "/v1/memories/batch": {
      post: {
        operationId: "uploadMemoryBatch",
        summary: "Upload sanitized memory chunks",
        tags: ["Memories"],
        security: authenticated,
        requestBody: jsonBody({ $ref: "#/components/schemas/MemoryBatchUpload" }),
        responses: standardAuthenticatedResponses("Memory batch processed", { $ref: "#/components/schemas/MemoryBatchResult" }),
      },
    },
    "/v1/memories/count": {
      get: {
        operationId: "countMemories",
        summary: "Count stored cloud memories",
        tags: ["Memories"],
        security: authenticated,
        responses: standardAuthenticatedResponses("Memory count", { $ref: "#/components/schemas/MemoryCount" }),
      },
    },
    "/v1/memories/browse": {
      get: {
        operationId: "browseMemories",
        summary: "Browse newest memories with optional filters",
        tags: ["Memories"],
        security: authenticated,
        parameters: memoryFilterParameters(),
        responses: standardAuthenticatedResponses("Filtered memories", { $ref: "#/components/schemas/BrowseResponse" }),
      },
    },
    "/v1/memories/search": {
      get: {
        operationId: "searchMemories",
        summary: "Hybrid full-text and vector search",
        tags: ["Memories"],
        security: authenticated,
        parameters: [
          queryParameter("query", "string", false, "Search phrase; omit it to search by filters only"),
          queryParameter("q", "string", false, "Deprecated alias for query"),
          ...memoryFilterParameters(),
        ],
        responses: standardAuthenticatedResponses("Ranked memory results", { $ref: "#/components/schemas/SearchResponse" }),
      },
    },
    "/v1/memories/export": {
      get: {
        operationId: "exportMemories",
        summary: "Export all cloud memories as JSON",
        tags: ["Memories"],
        security: authenticated,
        responses: standardAuthenticatedResponses("Memory export", { $ref: "#/components/schemas/MemoryExport" }),
      },
    },
    "/v1/memories": {
      delete: {
        operationId: "deleteMemories",
        summary: "Delete all cloud memories for the current user",
        tags: ["Memories"],
        security: authenticated,
        responses: standardAuthenticatedResponses("Cloud memories deleted", { $ref: "#/components/schemas/DeleteCount" }),
      },
    },
    "/v1/dashboard": {
      get: {
        operationId: "getDashboardSummary",
        summary: "Load dashboard summary data",
        tags: ["Memories"],
        security: authenticated,
        responses: standardAuthenticatedResponses("Dashboard summary", { $ref: "#/components/schemas/DashboardSummary" }),
      },
    },
    "/v1/conversations": {
      get: {
        operationId: "listConversations",
        summary: "List conversation summaries",
        tags: ["Conversations"],
        security: authenticated,
        parameters: [
          queryParameter("limit", "integer", false, "Page size from 1 to 50", { minimum: 1, maximum: 50, default: 20 }),
          queryParameter("sourceTool", "string", false, "claude, codex, cursor, or fixtures"),
          queryParameter("workspacePath", "string", false, "Exact workspace path"),
          queryParameter("cursor", "string", false, "Opaque cursor returned by the previous page"),
        ],
        responses: standardAuthenticatedResponses("Conversation page", { $ref: "#/components/schemas/ConversationPage" }),
      },
    },
    "/v1/conversations/{sessionId}": {
      get: {
        operationId: "getConversation",
        summary: "Read a conversation chronologically",
        tags: ["Conversations"],
        security: authenticated,
        parameters: [
          { $ref: "#/components/parameters/SessionId" },
          queryParameter("sourceTool", "string", true, "Conversation source tool"),
          queryParameter("limit", "integer", false, "Page size from 1 to 100", { minimum: 1, maximum: 100, default: 50 }),
          queryParameter("cursor", "string", false, "Opaque cursor returned by the previous page"),
        ],
        responses: {
          ...standardAuthenticatedResponses("Conversation entries", { $ref: "#/components/schemas/ConversationEntryPage" }),
          "404": errorResponse,
        },
      },
    },
    "/v1/audit-logs": {
      get: {
        operationId: "listAuditEvents",
        summary: "List recent account audit events",
        tags: ["Audit"],
        security: authenticated,
        responses: standardAuthenticatedResponses("Audit events", { $ref: "#/components/schemas/AuditResponse" }),
      },
    },
    "/mcp": {
      post: {
        operationId: "callMcp",
        summary: "Call the hosted Model Context Protocol endpoint",
        tags: ["MCP"],
        security: authenticated,
        requestBody: jsonBody({ $ref: "#/components/schemas/JsonRpcRequest" }),
        responses: standardAuthenticatedResponses("JSON-RPC response", { $ref: "#/components/schemas/JsonRpcResponse" }),
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "Mimir access token" },
      cookieAuth: { type: "apiKey", in: "cookie", name: "mimir_session" },
    },
    parameters: {
      InstallId: { name: "installId", in: "path", required: true, schema: { type: "string" } },
      SessionId: { name: "sessionId", in: "path", required: true, schema: { type: "string" } },
    },
    schemas: {
      Error: objectSchema({ error: { type: "string" }, requestId: { type: "string" } }, ["error"]),
      Health: objectSchema({
        name: { type: "string", const: "mimir" },
        status: { type: "string", enum: ["ok", "unavailable"] },
        database: { type: "string", enum: ["configured", "not_configured"] },
      }, ["name", "status", "database"]),
      DeviceLoginStartRequest: objectSchema({ client: { type: "string", maxLength: 80 }, installId: { type: "string", pattern: "^install_[0-9a-fA-F-]{36}$" } }, ["installId"]),
      DeviceLoginStart: objectSchema({ deviceCode: { type: "string" }, userCode: { type: "string" }, verificationUri: { type: "string", format: "uri" }, interval: { type: "integer" }, expiresIn: { type: "integer" } }, ["deviceCode", "userCode", "verificationUri", "interval", "expiresIn"]),
      DeviceLoginCompleteRequest: objectSchema({ deviceCode: { type: "string" } }, ["deviceCode"]),
      DeviceLoginComplete: objectSchema({ accessToken: { type: "string", writeOnly: true }, userId: { type: "string" }, expiresAt: { type: "number" } }, ["accessToken", "userId"]),
      RevokeResult: objectSchema({ revoked: { type: "boolean" } }, ["revoked"]),
      RevokeCount: objectSchema({ revoked: { type: "integer", minimum: 0 } }, ["revoked"]),
      DeleteResult: objectSchema({ deleted: { type: "boolean" } }, ["deleted"]),
      DeleteCount: objectSchema({ deleted: { type: "integer", minimum: 0 } }, ["deleted"]),
      MemoryChunkUpload: objectSchema({
        sourceTool: { type: "string" }, workspacePath: { type: ["string", "null"] }, sessionId: { type: "string" }, role: { type: "string" }, timestamp: { type: "number" }, content: { type: "string" }, contentHash: { type: "string" }, embeddingProvider: { type: "string" }, embeddingModel: { type: "string" }, embedding: { type: "array", minItems: 1536, maxItems: 1536, items: { type: "number" } },
      }, ["sourceTool", "sessionId", "role", "timestamp", "content", "contentHash", "embeddingProvider", "embeddingModel", "embedding"]),
      MemoryBatchUpload: objectSchema({ chunks: { type: "array", minItems: 1, maxItems: 500, items: { $ref: "#/components/schemas/MemoryChunkUpload" } } }, ["chunks"]),
      MemoryBatchResult: objectSchema({ accepted: { type: "integer", minimum: 0 }, acceptedContentHashes: { type: "array", items: { type: "string" } } }, ["accepted", "acceptedContentHashes"]),
      MemoryCount: objectSchema({ userId: { type: "string" }, count: { type: "integer", minimum: 0 } }, ["userId", "count"]),
      MemoryItem: memoryItemSchema(false),
      SearchMemoryItem: memoryItemSchema(true),
      BrowseResponse: objectSchema({ mode: { type: "string", const: "browse" }, resultCount: { type: "integer" }, results: { type: "array", items: { $ref: "#/components/schemas/MemoryItem" } }, metadata: { type: "object", additionalProperties: true } }, ["mode", "resultCount", "results", "metadata"]),
      SearchResponse: objectSchema({ query: { type: "string" }, resultCount: { type: "integer" }, results: { type: "array", items: { $ref: "#/components/schemas/SearchMemoryItem" } }, metadata: { type: "object", additionalProperties: true } }, ["query", "resultCount", "results", "metadata"]),
      MemoryExport: objectSchema({ userId: { type: "string" }, exportedAt: { type: "string", format: "date-time" }, memories: { type: "array", items: { type: "object", additionalProperties: true } } }, ["userId", "exportedAt", "memories"]),
      ConversationSummary: objectSchema({ sourceTool: { type: "string" }, workspacePath: { type: ["string", "null"] }, sessionId: { type: "string" }, title: { type: "string" }, startedAt: { type: "number" }, lastActivityAt: { type: "number" }, memoryCount: { type: "integer" } }, ["sourceTool", "sessionId", "title", "startedAt", "lastActivityAt", "memoryCount"]),
      ConversationPage: objectSchema({ conversations: { type: "array", items: { $ref: "#/components/schemas/ConversationSummary" } }, nextCursor: { type: ["string", "null"] } }, ["conversations", "nextCursor"]),
      ConversationEntryPage: objectSchema({ sourceTool: { type: "string" }, sessionId: { type: "string" }, entries: { type: "array", items: { $ref: "#/components/schemas/MemoryItem" } }, nextCursor: { type: ["string", "null"] } }, ["sourceTool", "sessionId", "entries", "nextCursor"]),
      DashboardSummary: { type: "object", additionalProperties: true },
      AuditResponse: { type: "object", additionalProperties: true },
      JsonRpcRequest: objectSchema({ jsonrpc: { type: "string", const: "2.0" }, id: {}, method: { type: "string" }, params: { type: "object", additionalProperties: true } }, ["jsonrpc", "method"]),
      JsonRpcResponse: { type: "object", additionalProperties: true },
    },
  },
} as const;

function objectSchema(properties: Record<string, unknown>, required: string[] = []) {
  return { type: "object", additionalProperties: false, properties, required };
}

function memoryItemSchema(withScore: boolean) {
  return objectSchema({
    chunkId: { type: "string" }, sourceTool: { type: "string" }, workspacePath: { type: ["string", "null"] }, sessionId: { type: "string" }, role: { type: "string" }, timestamp: { type: "number" }, isoTimestamp: { type: "string", format: "date-time" }, content: { type: "string" }, ...(withScore ? { score: { type: "number" }, distance: { type: "number" } } : {}),
  }, ["chunkId", "sourceTool", "sessionId", "role", "timestamp", "content"]);
}

function jsonBody(schema: unknown) {
  return { required: true, content: { "application/json": { schema } } };
}

function jsonResponse(description: string, schema: unknown) {
  return { description, content: { "application/json": { schema } } };
}

function standardAuthenticatedResponses(description: string, schema: unknown) {
  return {
    "200": jsonResponse(description, schema),
    "400": errorResponse,
    "401": errorResponse,
    "429": errorResponse,
    "503": errorResponse,
  };
}

function queryParameter(name: string, type: string, required: boolean, description: string, schema: Record<string, unknown> = {}) {
  return { name, in: "query", required, description, schema: { type, ...schema } };
}

function memoryFilterParameters() {
  return [
    queryParameter("limit", "integer", false, "Result count from 1 to 20", { minimum: 1, maximum: 20, default: 10 }),
    queryParameter("sourceTool", "string", false, "claude, codex, cursor, or fixtures"),
    queryParameter("sessionId", "string", false, "Exact session identifier"),
    queryParameter("workspacePath", "string", false, "Exact workspace path"),
    queryParameter("role", "string", false, "Message role such as user or assistant"),
    queryParameter("since", "string", false, "ISO timestamp or Unix timestamp"),
    queryParameter("until", "string", false, "ISO timestamp or Unix timestamp"),
  ];
}
