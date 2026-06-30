import { z } from "zod";

export const mcpSearchHistoricalChatsDtoSchema = z.object({
  query: z.string().min(1),
  limit: z.union([z.string(), z.number()]).optional(),
  sourceTool: z.string().optional(),
  sessionId: z.string().optional(),
  workspacePath: z.string().optional(),
  since: z.string().optional(),
  until: z.string().optional(),
});

export type McpSearchHistoricalChatsDto = z.infer<typeof mcpSearchHistoricalChatsDtoSchema>;
