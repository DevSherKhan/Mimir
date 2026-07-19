import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const packageMetadata: unknown = require("../package.json");

if (!isPackageMetadata(packageMetadata)) {
  throw new Error("Mimir package metadata does not contain a valid version");
}

export const MIMIR_VERSION = packageMetadata.version;

function isPackageMetadata(value: unknown): value is { version: string } {
  return typeof value === "object"
    && value !== null
    && "version" in value
    && typeof value.version === "string"
    && /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u.test(value.version);
}
