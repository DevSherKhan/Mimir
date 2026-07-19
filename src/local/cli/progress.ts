import type { UploadProgress } from "../../cloud/client/upload.js";

interface TerminalStream {
  isTTY?: boolean;
  columns?: number;
  write(chunk: string): unknown;
}

export interface UploadProgressBar {
  update(progress: UploadProgress): void;
  stop(): void;
}

export function createUploadProgressBar(stream: TerminalStream = process.stderr): UploadProgressBar {
  let active = false;

  return {
    update(progress) {
      if (!stream.isTTY || progress.total === 0) {
        return;
      }

      const width = Math.max(10, Math.min(36, (stream.columns ?? 80) - 58));
      stream.write(`\r\u001b[2K${formatUploadProgress(progress, width)}`);
      active = progress.processed < progress.total;

      if (!active) {
        stream.write("\n");
      }
    },
    stop() {
      if (active) {
        stream.write("\n");
        active = false;
      }
    },
  };
}

export function formatUploadProgress(progress: UploadProgress, width = 24): string {
  const safeTotal = Math.max(0, progress.total);
  const safeProcessed = Math.min(Math.max(0, progress.processed), safeTotal);
  const ratio = safeTotal === 0 ? 1 : safeProcessed / safeTotal;
  const filled = Math.round(ratio * width);
  const percentage = Math.round(ratio * 100);
  const bar = `${"█".repeat(filled)}${"░".repeat(width - filled)}`;
  const batches = progress.totalBatches > 0
    ? ` · batch ${progress.completedBatches}/${progress.totalBatches}`
    : "";

  return `Uploading [${bar}] ${String(percentage).padStart(3)}% · ${safeProcessed}/${safeTotal} chunks${batches}`;
}
