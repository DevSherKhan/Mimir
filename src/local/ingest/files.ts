import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

export function listFilesRecursive(root: string, predicate: (path: string) => boolean): string[] {
  const files: string[] = [];

  function visit(path: string): void {
    let stat;
    try {
      stat = statSync(path);
    } catch {
      return;
    }

    if (stat.isFile()) {
      if (predicate(path)) {
        files.push(path);
      }
      return;
    }

    if (!stat.isDirectory()) {
      return;
    }

    let entries: string[];
    try {
      entries = readdirSync(path);
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry === "node_modules" || entry === ".git") {
        continue;
      }
      visit(join(path, entry));
    }
  }

  visit(root);
  return files;
}
