import type { FastifyInstance } from "fastify";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { readFile } from "node:fs/promises";
import { openApiDocument } from "../openapi/document.js";

const require = createRequire(import.meta.url);
const swaggerUiRoot = dirname(require.resolve("swagger-ui-dist/package.json"));
const assetTypes: Record<string, string> = {
  "swagger-ui.css": "text/css; charset=utf-8",
  "swagger-ui-bundle.js": "application/javascript; charset=utf-8",
  "swagger-ui-standalone-preset.js": "application/javascript; charset=utf-8",
  "favicon-32x32.png": "image/png",
};

export async function registerDocsRoutes(app: FastifyInstance): Promise<void> {
  if (process.env.MIMIR_DOCS_ENABLED?.trim().toLowerCase() === "false") {
    return;
  }

  const assets = new Map(await Promise.all(Object.keys(assetTypes).map(async (fileName) => [
    fileName,
    await readFile(join(swaggerUiRoot, fileName)),
  ] as const)));

  app.get("/openapi.json", async (_request, reply) => reply.header("Cache-Control", "no-cache").send(openApiDocument));
  app.get("/docs", async (_request, reply) => reply.redirect("/docs/"));
  app.get("/docs/", async (_request, reply) => reply.header("Cache-Control", "no-cache").type("text/html; charset=utf-8").send(swaggerHtml()));
  app.get("/docs/swagger-initializer.js", async (_request, reply) => reply
    .type("application/javascript; charset=utf-8")
    .send(swaggerInitializer()));

  for (const [fileName, contentType] of Object.entries(assetTypes)) {
    app.get(`/docs/${fileName}`, async (_request, reply) => {
      return reply.header("Cache-Control", "public, max-age=86400").type(contentType).send(assets.get(fileName));
    });
  }
}

function swaggerHtml(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex,nofollow">
    <title>Mimir Cloud API</title>
    <link rel="icon" type="image/png" href="/docs/favicon-32x32.png">
    <link rel="stylesheet" href="/docs/swagger-ui.css">
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="/docs/swagger-ui-bundle.js"></script>
    <script src="/docs/swagger-ui-standalone-preset.js"></script>
    <script src="/docs/swagger-initializer.js"></script>
  </body>
</html>`;
}

function swaggerInitializer(): string {
  return `window.addEventListener("load", function () {
  window.ui = SwaggerUIBundle({
    url: "/openapi.json",
    dom_id: "#swagger-ui",
    deepLinking: true,
    displayRequestDuration: true,
    persistAuthorization: false,
    presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
    layout: "StandaloneLayout"
  });
});`;
}
