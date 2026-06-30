import { z } from "zod";
import { EMBEDDING_DIMENSIONS } from "../../config/index.js";

export const uploadMemoryChunkDtoSchema = z.object({
  sourceTool: z.string().min(1),
  workspacePath: z.string().nullable().optional(),
  sessionId: z.string().min(1),
  role: z.string().min(1),
  timestamp: z.number().finite(),
  content: z.string().min(1),
  contentHash: z.string().min(1),
  embeddingProvider: z.string().min(1),
  embeddingModel: z.string().min(1),
  embedding: z.array(z.number().finite()).length(EMBEDDING_DIMENSIONS),
});

export const uploadMemoryBatchDtoSchema = z.object({
  chunks: z.array(uploadMemoryChunkDtoSchema),
});

export const searchMemoriesQueryDtoSchema = z.object({
  query: z.string().optional(),
  q: z.string().optional(),
  limit: z.union([z.string(), z.number()]).optional(),
  sourceTool: z.string().optional(),
  sessionId: z.string().optional(),
  workspacePath: z.string().optional(),
  since: z.string().optional(),
  until: z.string().optional(),
});

export type UploadMemoryChunkDto = z.infer<typeof uploadMemoryChunkDtoSchema>;
export type UploadMemoryBatchDto = z.infer<typeof uploadMemoryBatchDtoSchema>;
export type SearchMemoriesQueryDto = z.infer<typeof searchMemoriesQueryDtoSchema>;
