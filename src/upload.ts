import type BetterSqlite3 from "better-sqlite3";
import { readCredentials, isExpired } from "./auth.js";
import { createCloudClient } from "./cloud.js";
import { listUploadChunks, markChunksUploaded } from "./db.js";

export interface UploadOptions {
  homeDir: string;
  db: BetterSqlite3.Database;
  cloudUrl?: string;
  limit: number;
  batchSize: number;
  dryRun: boolean;
  force: boolean;
}

export interface UploadResult {
  cloudUrl: string;
  selected: number;
  uploaded: number;
  dryRun: boolean;
}

export async function uploadPendingChunks(options: UploadOptions): Promise<UploadResult> {
  const credentials = readCredentials(options.homeDir);
  if (!credentials) {
    throw new Error("Not logged in. Run mimir login first.");
  }

  if (isExpired(credentials)) {
    throw new Error("Stored cloud credentials are expired. Run mimir login again.");
  }

  const cloudUrl = options.cloudUrl ?? credentials.cloudUrl;
  const chunks = listUploadChunks(options.db, cloudUrl, options.limit, options.force);
  if (options.dryRun) {
    return {
      cloudUrl,
      selected: chunks.length,
      uploaded: 0,
      dryRun: true,
    };
  }

  const client = createCloudClient(cloudUrl);
  let uploaded = 0;

  for (let index = 0; index < chunks.length; index += options.batchSize) {
    const batch = chunks.slice(index, index + options.batchSize);
    const response = await client.uploadMemoryBatch(batch, credentials.accessToken);
    const acceptedContentHashes = response.acceptedContentHashes ?? batch.map((chunk) => chunk.contentHash);
    markChunksUploaded(options.db, cloudUrl, acceptedContentHashes);
    uploaded += acceptedContentHashes.length;
  }

  return {
    cloudUrl,
    selected: chunks.length,
    uploaded,
    dryRun: false,
  };
}
