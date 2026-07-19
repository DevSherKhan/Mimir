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
    description: "Index your first conversations and run a local search.",
    section: "Get started",
    keywords: ["init", "sync", "query", "status"],
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
    description: "Connect Mimir to Claude Code, Codex, or another MCP client.",
    section: "Integrations",
    keywords: ["mcp", "claude", "codex", "stdio", "tool"],
  },
  {
    path: "/cloud/dashboard/",
    title: "Cloud dashboard",
    description: "Upload sanitized memory and browse it from the optional dashboard.",
    section: "Cloud",
    keywords: ["dashboard", "upload", "login", "cloud", "browser"],
  },
  {
    path: "/self-hosting/deployment/",
    title: "Self-hosting",
    description: "Run Mimir with PostgreSQL locally or deploy it to Railway.",
    section: "Self-host",
    keywords: ["deploy", "postgres", "pgvector", "railway", "docker"],
  },
  {
    path: "/reference/configuration/",
    title: "Configuration",
    description: "Environment variables for local, cloud, and production usage.",
    section: "Reference",
    keywords: ["environment", "config", "variables", "openai", "database"],
  },
  {
    path: "/reference/cli/",
    title: "CLI reference",
    description: "Commands and options exposed by the Mimir command-line interface.",
    section: "Reference",
    keywords: ["command", "flags", "sync", "query", "upload", "login"],
  },
  {
    path: "/reference/api/",
    title: "API and OpenAPI",
    description: "Use Swagger UI, the OpenAPI contract, and authenticated cloud endpoints.",
    section: "Reference",
    keywords: ["api", "swagger", "openapi", "http", "endpoint"],
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
    description: "Resolve installation, native dependency, search, dashboard, and upload issues.",
    section: "Help",
    keywords: ["help", "error", "sqlite", "node", "database", "404"],
  },
  {
    path: "/community/contributing/",
    title: "Contributing",
    description: "Set up a development environment and contribute safely to Mimir.",
    section: "Community",
    keywords: ["development", "pull request", "test", "release", "community"],
  },
];

const navigationOrder = ["Get started", "Integrations", "Cloud", "Self-host", "Reference", "Help", "Community"];

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
