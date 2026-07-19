import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { pages } from "./src/site";

const base = normalizeBase(process.env.DOCS_BASE_PATH ?? "/");
const outputDirectory = resolve(import.meta.dirname, "../dist-docs");

export default defineConfig({
  root: import.meta.dirname,
  base,
  plugins: [react(), staticRoutes()],
  build: {
    outDir: outputDirectory,
    emptyOutDir: true,
  },
  server: {
    port: 4174,
  },
  preview: {
    port: 4174,
  },
});

function normalizeBase(value: string): string {
  const withLeadingSlash = value.startsWith("/") ? value : `/${value}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}

function staticRoutes(): Plugin {
  return {
    name: "mimir-docs-static-routes",
    closeBundle() {
      const source = resolve(outputDirectory, "index.html");
      const sourceHtml = readFileSync(source, "utf8");

      for (const page of pages) {
        const pageHtml = renderPageHtml(sourceHtml, page);

        if (page.path === "/") {
          writeFileSync(source, pageHtml);
          continue;
        }

        const targetDirectory = resolve(outputDirectory, page.path.slice(1));
        mkdirSync(targetDirectory, { recursive: true });
        writeFileSync(resolve(targetDirectory, "index.html"), pageHtml);
      }

      const notFoundHtml = sourceHtml
        .replace(/<title>.*?<\/title>/u, "<title>Page not found · Mimir</title>")
        .replace("</head>", '    <meta name="robots" content="noindex" />\n  </head>');
      writeFileSync(resolve(outputDirectory, "404.html"), notFoundHtml);

      const siteUrl = "https://devsherkhan.github.io/Mimir";
      const sitemap = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...pages.map((page) => `  <url><loc>${siteUrl}${page.path}</loc></url>`),
        "</urlset>",
        "",
      ].join("\n");
      writeFileSync(resolve(outputDirectory, "sitemap.xml"), sitemap);
      writeFileSync(
        resolve(outputDirectory, "robots.txt"),
        `User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`,
      );
    },
  };
}

function renderPageHtml(
  sourceHtml: string,
  page: { path: string; title: string; description: string },
): string {
  const title = page.path === "/" ? page.title : `${page.title} · Mimir`;
  const canonicalUrl = `https://devsherkhan.github.io/Mimir${page.path}`;
  return sourceHtml
    .replace(/<title>.*?<\/title>/u, `<title>${escapeHtml(title)}</title>`)
    .replace(
      /(<meta\s+name="description"\s+content=")[^"]*(")/u,
      `$1${escapeHtml(page.description)}$2`,
    )
    .replace(
      /(<meta\s+property="og:title"\s+content=")[^"]*(")/u,
      `$1${escapeHtml(title)}$2`,
    )
    .replace(
      /(<meta\s+property="og:description"\s+content=")[^"]*(")/u,
      `$1${escapeHtml(page.description)}$2`,
    )
    .replace("</head>", `    <link rel="canonical" href="${canonicalUrl}" />\n  </head>`);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
