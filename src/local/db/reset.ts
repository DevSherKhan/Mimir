import { existsSync, rmSync } from "node:fs";
import { openMimirDatabase } from "./sqlite.js";

export interface ResetLocalDatabaseResult {
  dbPath: string;
  deletedPaths: string[];
}

export function resetLocalDatabase(dbPath: string): ResetLocalDatabaseResult {
  const dbFiles = [
    dbPath,
    `${dbPath}-wal`,
    `${dbPath}-shm`,
  ];
  const deletedPaths = dbFiles.filter((path) => existsSync(path));

  for (const path of dbFiles) {
    rmSync(path, { force: true });
  }

  const database = openMimirDatabase(dbPath);
  database.close();

  return {
    dbPath,
    deletedPaths,
  };
}
