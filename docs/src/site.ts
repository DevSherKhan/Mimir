export interface PageMeta {
  path: string;
  title: string;
  description: string;
  section: string;
  keywords: string[];
}

export interface NavigationGroup {
  title: string;
  pages: PageMeta[];
}

export const pages: PageMeta[] = [
  {
    path: "/",
    title: "Mimir Documentation",
    description: "Local-first searchable memory for your AI coding conversations.",
    section: "Overview",
    keywords: ["home", "overview", "memory", "local-first"],
  },
  {
    path: "/guide/installation/",
    title: "Installation",
    description: "Install the Mimir command and verify your local environment.",
    section: "Get started",
    keywords: ["npm", "node", "install", "doctor"],
  },
  {
    path: "/guide/quick-start/",
    title: "Quick start",
    description: "Index your chats, wire MCP, and search from your AI tools.",
    section: "Get started",
    keywords: ["init", "sync", "add-mcp", "query", "status"],
  },
  {
    path: "/guide/search/",
    title: "Search",
    description: "Search naturally and narrow results with precise filters.",
    section: "Get started",
    keywords: ["semantic", "filter", "source", "session", "workspace", "date"],
  },
  {
    path: "/integrations/mcp/",
    title: "MCP integration",
    description: "Connect Mimir to Claude Code, Codex, Cursor, or another MCP client with add-mcp or each tool's CLI.",
    section: "Integrations",
    keywords: ["mcp", "add-mcp", "claude", "codex", "cursor", "stdio", "config.toml", "tool"],
  },
  {
    path: "/cloud/dashboard/",
    title: "Cloud dashboard (experimental)",
    description: "Frozen experimental cloud/dashboard surface. Not part of the supported install path.",
    section: "Experimental",
    keywords: ["dashboard", "upload", "login", "cloud", "browser", "experimental"],
  },
  {
    path: "/self-hosting/deployment/",
    title: "Self-hosting (experimental)",
    description: "Frozen experimental self-host surface for the optional cloud API.",
    section: "Experimental",
    keywords: ["deploy", "postgres", "pgvector", "railway", "docker", "experimental"],
  },
  {
    path: "/reference/configuration/",
    title: "Configuration",
    description: "Environment variables for the local CLI and embeddings.",
    section: "Reference",
    keywords: ["environment", "config", "variables", "openai"],
  },
  {
    path: "/reference/cli/",
    title: "CLI reference",
    description: "Commands and options exposed by the Mimir command-line interface.",
    section: "Reference",
    keywords: ["command", "flags", "sync", "query", "add-mcp", "mcp"],
  },
  {
    path: "/reference/api/",
    title: "API and OpenAPI (experimental)",
    description: "Frozen experimental cloud API docs. Not part of the supported install path.",
    section: "Experimental",
    keywords: ["api", "swagger", "openapi", "http", "endpoint", "experimental"],
  },
  {
    path: "/reference/security/",
    title: "Privacy and security",
    description: "Understand local storage, redaction, authentication, and trust boundaries.",
    section: "Reference",
    keywords: ["security", "privacy", "redaction", "token", "sqlite"],
  },
  {
    path: "/help/troubleshooting/",
    title: "Troubleshooting",
    description: "Resolve installation, native dependency, sync, search, and MCP issues.",
    section: "Help",
    keywords: ["help", "error", "sqlite", "node", "database", "mcp"],
  },
  {
    path: "/community/contributing/",
    title: "Contributing",
    description: "Set up a development environment and contribute safely to Mimir.",
    section: "Community",
    keywords: ["development", "pull request", "test", "release", "community"],
  },
];

const navigationOrder = ["Get started", "Integrations", "Reference", "Help", "Community", "Experimental"];

export const navigation: NavigationGroup[] = navigationOrder.map((title) => ({
  title,
  pages: pages.filter((page) => page.section === title),
}));

export const pagePaths = pages.map((page) => page.path);

export function findPage(path: string): PageMeta | undefined {
  const normalized = normalizePath(path);
  return pages.find((page) => page.path === normalized);
}

export function normalizePath(path: string): string {
  if (!path || path === "/") {
    return "/";
  }

  const withoutQuery = path.split(/[?#]/u, 1)[0] ?? "/";
  const withLeadingSlash = withoutQuery.startsWith("/") ? withoutQuery : `/${withoutQuery}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}
