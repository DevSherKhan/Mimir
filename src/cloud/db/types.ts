import type { UploadMemoryChunkDto } from "../dto/memory.dto.js";

export interface CloudDatabase {
  startDeviceLogin(baseUrl: string, installId: string, clientName?: string): Promise<DeviceLoginStart>;
  approveDeviceLogin(deviceCode: string): Promise<DeviceLoginApproval>;
  completeDeviceLogin(deviceCode: string): Promise<DeviceLoginComplete | null>;
  userIdForBearerToken(token: string): Promise<string | null>;
  insertMemoryBatch(userId: string, chunks: UploadMemoryChunkDto[]): Promise<string[]>;
  countMemories(userId: string): Promise<number>;
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
