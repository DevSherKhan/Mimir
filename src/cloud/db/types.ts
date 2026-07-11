import type { UploadMemoryChunkDto } from "../dto/memory.dto.js";

export interface CloudDatabase {
  startDeviceLogin(baseUrl: string, installId: string, clientName?: string): Promise<DeviceLoginStart>;
  approveDeviceLogin(deviceCode: string): Promise<DeviceLoginApproval>;
  completeDeviceLogin(deviceCode: string): Promise<DeviceLoginComplete | null>;
  userIdForBearerToken(token: string): Promise<string | null>;
  revokeBearerToken(token: string): Promise<boolean>;
  revokeAllBearerTokens(userId: string): Promise<number>;
  deleteInstallIdentity(userId: string, installId: string): Promise<boolean>;
  recordAuditEvent(userId: string | null, action: string, metadata?: Record<string, unknown>): Promise<void>;
  insertMemoryBatch(userId: string, chunks: UploadMemoryChunkDto[]): Promise<string[]>;
  countMemories(userId: string): Promise<number>;
  deleteMemories(userId: string): Promise<number>;
  exportMemories(userId: string): Promise<CloudMemoryExport[]>;
  getDashboardSummary(userId: string): Promise<CloudDashboardSummary>;
  searchMemories(userId: string, embedding: number[], options: CloudSearchOptions): Promise<CloudSearchResult[]>;
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
  since?: number;
  until?: number;
}

export interface CloudSearchResult {
  chunkId: string;
  sourceTool: string;
  workspacePath: string | null;
  sessionId: string;
  role: string;
  timestamp: number;
  distance: number;
  content: string;
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
}
