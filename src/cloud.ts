import type { MemoryChunkUpload } from "./db.js";

export interface DeviceStartResponse {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  interval?: number;
  expiresIn?: number;
}

export interface DeviceCompleteResponse {
  accessToken: string;
  userId?: string;
  expiresAt?: number;
}

export interface UploadBatchResponse {
  accepted?: number;
  acceptedContentHashes?: string[];
}

export interface CloudClient {
  startDeviceLogin(): Promise<DeviceStartResponse>;
  completeDeviceLogin(deviceCode: string): Promise<DeviceCompleteResponse | null>;
  uploadMemoryBatch(chunks: MemoryChunkUpload[], accessToken: string): Promise<UploadBatchResponse>;
}

export function createCloudClient(cloudUrl: string): CloudClient {
  return {
    async startDeviceLogin() {
      return requestJson<DeviceStartResponse>(`${cloudUrl}/v1/auth/device/start`, {
        method: "POST",
        body: JSON.stringify({ client: "mimir-cli" }),
      });
    },

    async completeDeviceLogin(deviceCode: string) {
      try {
        return await requestJson<DeviceCompleteResponse>(`${cloudUrl}/v1/auth/device/complete`, {
          method: "POST",
          body: JSON.stringify({ deviceCode }),
        });
      } catch (error) {
        if (error instanceof CloudHttpError && error.status === 428) {
          return null;
        }
        throw error;
      }
    },

    async uploadMemoryBatch(chunks: MemoryChunkUpload[], accessToken: string) {
      return requestJson<UploadBatchResponse>(`${cloudUrl}/v1/memories/batch`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ chunks }),
      });
    },
  };
}

export class CloudHttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function requestJson<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...init.headers,
    },
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) as unknown : {};

  if (!response.ok) {
    const message = isRecord(body) && typeof body.error === "string"
      ? body.error
      : `Cloud request failed with HTTP ${response.status}`;
    throw new CloudHttpError(response.status, message);
  }

  return body as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
