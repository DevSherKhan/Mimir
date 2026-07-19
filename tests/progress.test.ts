import { describe, expect, it, vi } from "vitest";
import { createUploadProgressBar, formatUploadProgress } from "../src/local/cli/progress.js";

describe("terminal upload progress", () => {
  it("formats chunk and batch progress as a bar", () => {
    const output = formatUploadProgress({
      processed: 150,
      total: 200,
      uploaded: 150,
      completedBatches: 3,
      totalBatches: 4,
    }, 20);

    expect(output).toContain("[███████████████░░░░░]");
    expect(output).toContain("75%");
    expect(output).toContain("150/200 chunks");
    expect(output).toContain("batch 3/4");
  });

  it("only renders in an interactive terminal and ends completed output with a newline", () => {
    const write = vi.fn();
    const progress = createUploadProgressBar({ isTTY: true, columns: 100, write });

    progress.update({
      processed: 0,
      total: 10,
      uploaded: 0,
      completedBatches: 0,
      totalBatches: 1,
    });
    progress.update({
      processed: 10,
      total: 10,
      uploaded: 10,
      completedBatches: 1,
      totalBatches: 1,
    });

    expect(write).toHaveBeenCalledTimes(3);
    expect(write).toHaveBeenLastCalledWith("\n");

    const redirectedWrite = vi.fn();
    const redirected = createUploadProgressBar({ isTTY: false, write: redirectedWrite });
    redirected.update({
      processed: 10,
      total: 10,
      uploaded: 10,
      completedBatches: 1,
      totalBatches: 1,
    });
    expect(redirectedWrite).not.toHaveBeenCalled();
  });
});
