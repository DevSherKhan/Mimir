import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { getMimirConfig } from "./config.js";
import { openMimirDatabase, searchChunks } from "./db.js";
import { createEmbeddingProvider } from "./embeddings/provider.js";
import { redactSecrets } from "./security/redact.js";
import { formatSearchResponse, normalizeSourceTool, parseOptionalTimestamp } from "./search.js";

export async function runMcpServer(): Promise<void> {
  const config = getMimirConfig();
  const provider = createEmbeddingProvider(config.embeddingProvider);
  const database = openMimirDatabase(config.dbPath);

  const server = new McpServer({
    name: "mimir",
    version: "0.1.0",
  });

  server.tool(
    "search_historical_chats",
    "Search locally indexed AI chat history.",
    {
      query: z.string().min(1).max(4000),
      limit: z.number().int().min(1).max(20).optional(),
      sourceTool: z.enum(["claude", "claude-code", "codex", "cursor", "fixture", "fixtures"]).optional(),
      sessionId: z.string().min(1).max(500).optional(),
      workspacePath: z.string().min(1).max(2000).optional(),
      since: z.string().min(1).max(100).optional(),
      until: z.string().min(1).max(100).optional(),
    },
    async ({ query, limit, sourceTool, sessionId, workspacePath, since, until }) => {
      const sanitizedQuery = redactSecrets(query);
      const embedding = await provider.embed(sanitizedQuery);
      const resultLimit = limit ?? 5;
      const filters = {
        sourceTool: normalizeSourceTool(sourceTool),
        sessionId,
        workspacePath,
        since: parseOptionalTimestamp(since, "since"),
        until: parseOptionalTimestamp(until, "until"),
      };
      const results = searchChunks(database.db, embedding, resultLimit, filters);
      const response = formatSearchResponse(sanitizedQuery, results, {
        provider: provider.name,
        model: provider.model,
        limit: resultLimit,
        filters,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response, null, 2),
          },
        ],
      };
    },
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
