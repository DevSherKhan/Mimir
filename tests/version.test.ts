import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { MIMIR_VERSION } from "../src/version.js";
import { openApiDocument } from "../src/server/openapi/document.js";

const require = createRequire(import.meta.url);
const packageMetadata = require("../package.json") as { version: string };

describe("package version", () => {
  it("keeps runtime and OpenAPI versions aligned with package.json", () => {
    expect(MIMIR_VERSION).toBe(packageMetadata.version);
    expect(openApiDocument.info.version).toBe(packageMetadata.version);
  });
});
