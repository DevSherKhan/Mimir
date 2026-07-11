import { CloudAuthRepository, userIdForDevToken } from "./repositories/auth.repository.js";
import { createCloudPool } from "./connection.js";
import { CloudMemoryRepository } from "./repositories/memory.repository.js";
import { runCloudMigrations } from "./migrator.js";
import type { CloudDatabase } from "./types.js";

export async function createCloudDatabase(databaseUrl = process.env.DATABASE_URL): Promise<CloudDatabase | null> {
  const pool = createCloudPool(databaseUrl);
  if (!pool) {
    return null;
  }

  await runCloudMigrations(pool);

  const auth = new CloudAuthRepository(pool);
  const memories = new CloudMemoryRepository(pool);

  return {
    startDeviceLogin: auth.startDeviceLogin.bind(auth),
    approveDeviceLogin: auth.approveDeviceLogin.bind(auth),
    completeDeviceLogin: auth.completeDeviceLogin.bind(auth),
    userIdForBearerToken: auth.userIdForBearerToken.bind(auth),
    revokeBearerToken: auth.revokeBearerToken.bind(auth),
    revokeAllBearerTokens: auth.revokeAllBearerTokens.bind(auth),
    deleteInstallIdentity: auth.deleteInstallIdentity.bind(auth),
    recordAuditEvent: auth.recordAuditEvent.bind(auth),
    insertMemoryBatch: memories.insertMemoryBatch.bind(memories),
    countMemories: memories.countMemories.bind(memories),
    deleteMemories: memories.deleteMemories.bind(memories),
    exportMemories: memories.exportMemories.bind(memories),
    getDashboardSummary: memories.getDashboardSummary.bind(memories),
    searchMemories: memories.searchMemories.bind(memories),
  };
}

export { userIdForDevToken };
export type { CloudDatabase } from "./types.js";
