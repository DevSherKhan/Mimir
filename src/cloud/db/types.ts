import type { UploadMemoryChunkDto } from "../dto/memory.dto.js";

export interface CloudDatabase {
  startDeviceLogin(baseUrl: string, installId: string, clientName?: string): Promise<DeviceLoginStart>;
  approveDeviceLogin(deviceCode: string): Promise<DeviceLoginApproval>;
  completeDeviceLogin(deviceCode: string): Promise<DeviceLoginComplete | null>;
  createBearerToken(userId: string): Promise<DeviceLoginComplete>;
  userIdForBearerToken(token: string): Promise<string | null>;
  revokeBearerToken(token: string): Promise<boolean>;
  revokeAllBearerTokens(userId: string): Promise<number>;
  deleteInstallIdentity(userId: string, installId: string): Promise<boolean>;
  recordAuditEvent(userId: string | null, action: string, metadata?: Record<string, unknown>): Promise<void>;
  consumeRateLimit(action: string, identifier: string, limit: number, windowMs: number): Promise<CloudRateLimitDecision>;
  listAuditEvents(userId: string, limit: number): Promise<CloudAuditEvent[]>;
  insertMemoryBatch(userId: string, chunks: UploadMemoryChunkDto[]): Promise<string[]>;
  countMemories(userId: string): Promise<number>;
  deleteMemories(userId: string): Promise<number>;
  exportMemories(userId: string): Promise<CloudMemoryExport[]>;
  getDashboardSummary(userId: string): Promise<CloudDashboardSummary>;
  listConversations(userId: string, options: CloudConversationListOptions): Promise<CloudConversationSummary[]>;
  listConversationEntries(userId: string, sourceTool: string, sessionId: string, options: CloudConversationEntryOptions): Promise<CloudConversationEntry[]>;
  listMemories(userId: string, options: CloudSearchOptions): Promise<CloudMemoryResult[]>;
  keywordSearchMemories(userId: string, query: string, options: CloudSearchOptions): Promise<CloudKeywordSearchResult[]>;
  searchMemories(userId: string, embedding: number[], options: CloudSearchOptions): Promise<CloudSearchResult[]>;
  close(): Promise<void>;
}

export class DeviceLoginStateError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "DeviceLoginStateError";
  }
}

export interface DeviceLoginComplete {
  accessToken: string;
  userId: string;
}

export interface DeviceLoginStart {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  interval: number;
  expiresIn: number;
}

export interface DeviceLoginApproval {
  userId: string;
}

export interface CloudSearchOptions {
  limit: number;
  sourceTool?: string;
  sessionId?: string;
  workspacePath?: string;
  role?: string;
  since?: number;
  until?: number;
}

export interface CloudConversationListOptions {
  limit: number;
  sourceTool?: string;
  workspacePath?: string;
  cursor?: {
    lastActivityAt: number;
    sourceTool: string;
    sessionId: string;
  };
}

export interface CloudConversationEntryOptions {
  limit: number;
  cursor?: {
    timestamp: number;
    chunkId: string;
  };
}

export interface CloudConversationSummary {
  sourceTool: string;
  workspacePath: string | null;
  sessionId: string;
  titleSeed: string;
  startedAt: number;
  lastActivityAt: number;
  memoryCount: number;
}

export interface CloudConversationEntry extends CloudMemoryResult {
  createdAt: string;
}

export interface CloudMemoryResult {
  chunkId: string;
  sourceTool: string;
  workspacePath: string | null;
  sessionId: string;
  role: string;
  timestamp: number;
  content: string;
}

export interface CloudSearchResult extends CloudMemoryResult {
  distance: number;
}

export interface CloudKeywordSearchResult extends CloudMemoryResult {
  textRank: number;
}

export interface CloudMemoryExport {
  id: string;
  sourceTool: string;
  workspacePath: string | null;
  sessionId: string;
  role: string;
  timestamp: number;
  content: string;
  contentHash: string;
  embeddingProvider: string;
  embeddingModel: string;
  createdAt: string;
}

export interface CloudDashboardSummary {
  userId: string;
  memoryCount: number;
  installIdentities: Array<{
    installId: string;
    createdAt: string;
    lastSeenAt: string;
  }>;
  recentMemories: CloudMemoryExport[];
  auditEvents: CloudAuditEvent[];
}

export interface CloudRateLimitDecision {
  allowed: boolean;
  retryAfterSeconds: number;
}

export interface CloudAuditEvent {
  id: string;
  action: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}
