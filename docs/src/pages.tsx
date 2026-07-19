import {
  ArrowRight,
  Bot,
  Cloud,
  Database,
  GitFork,
  Search,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  Callout,
  CodeBlock,
  CommandCard,
  DocsLink,
  NextSteps,
  PageIntro,
  Section,
  Step,
  Steps,
} from "./components";

const repositoryUrl = "https://github.com/DevSherKhan/Mimir";

export function renderPage(path: string): ReactNode {
  const renderers: Record<string, () => ReactNode> = {
    "/": HomePage,
    "/guide/installation/": InstallationPage,
    "/guide/quick-start/": QuickStartPage,
    "/guide/search/": SearchPage,
    "/integrations/mcp/": McpPage,
    "/cloud/dashboard/": CloudDashboardPage,
    "/self-hosting/deployment/": SelfHostingPage,
    "/reference/configuration/": ConfigurationPage,
    "/reference/cli/": CliPage,
    "/reference/api/": ApiPage,
    "/reference/security/": SecurityPage,
    "/help/troubleshooting/": TroubleshootingPage,
    "/community/contributing/": ContributingPage,
  };

  return (renderers[path] ?? NotFoundPage)();
}

function HomePage() {
  return (
    <div className="home-page">
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow-badge">Local-first AI memory</span>
          <h1>Your coding conversations, finally searchable.</h1>
          <p>
            Mimir indexes chats from Claude Code, Codex, and Cursor, then gives your AI tools a
            safe, searchable memory through the CLI and MCP.
          </p>
          <div className="hero-actions">
            <DocsLink className="button button-primary" to="/guide/installation/">
              Get started <ArrowRight aria-hidden="true" size={17} />
            </DocsLink>
            <DocsLink className="button button-secondary" to={repositoryUrl}>
              <GitFork aria-hidden="true" size={17} /> View on GitHub
            </DocsLink>
          </div>
        </div>
        <div className="hero-terminal" aria-label="Mimir quick start">
          <div className="terminal-header">
            <span />
            <span />
            <span />
            <small>Terminal</small>
          </div>
          <pre>
            <code>
              <span className="prompt">$</span> npm install -g mimir-chat-index{"\n"}
              <span className="prompt">$</span> mimir init{"\n"}
              <span className="prompt">$</span> mimir sync --source all{"\n"}
              <span className="success">✓ Indexed your AI chat history</span>
              {"\n"}
              <span className="prompt">$</span> mimir query "authentication decision"
            </code>
          </pre>
        </div>
      </section>

      <section className="home-section">
        <div className="section-heading">
          <span>One memory layer</span>
          <h2>Built for the way developers use AI</h2>
          <p>Start entirely local, then add cloud access only when your workflow needs it.</p>
        </div>
        <div className="feature-grid">
          <article>
            <Search aria-hidden="true" />
            <h3>Unified search</h3>
            <p>Search Claude Code, Codex, and Cursor conversations from one index.</p>
          </article>
          <article>
            <ShieldCheck aria-hidden="true" />
            <h3>Local by default</h3>
            <p>Chat history stays on your machine unless you explicitly upload it.</p>
          </article>
          <article>
            <Bot aria-hidden="true" />
            <h3>MCP ready</h3>
            <p>Give compatible assistants a focused, search-only historical chat tool.</p>
          </article>
          <article>
            <Cloud aria-hidden="true" />
            <h3>Optional cloud</h3>
            <p>Self-host a searchable dashboard for sanitized, uploaded memories.</p>
          </article>
        </div>
      </section>

      <section className="home-section architecture-section">
        <div className="section-heading">
          <span>How it works</span>
          <h2>A small, understandable data path</h2>
        </div>
        <div className="architecture-flow">
          <div>
            <Terminal aria-hidden="true" />
            <strong>Read locally</strong>
            <span>Mimir discovers supported chat files under your OS user account.</span>
          </div>
          <ArrowRight aria-hidden="true" className="flow-arrow" />
          <div>
            <ShieldCheck aria-hidden="true" />
            <strong>Sanitize and index</strong>
            <span>Common secrets are redacted before text is stored or embedded.</span>
          </div>
          <ArrowRight aria-hidden="true" className="flow-arrow" />
          <div>
            <Database aria-hidden="true" />
            <strong>Search anywhere</strong>
            <span>Use the local CLI, MCP, or your optional hosted dashboard.</span>
          </div>
        </div>
      </section>

      <section className="home-section">
        <div className="section-heading">
          <span>Popular guides</span>
          <h2>Go from install to useful memory</h2>
        </div>
        <div className="guide-grid">
          <DocsLink to="/guide/quick-start/">
            <small>5 minutes</small>
            <strong>Index your first chats</strong>
            <span>Initialize Mimir, sync supported sources, and search the result.</span>
          </DocsLink>
          <DocsLink to="/integrations/mcp/">
            <small>Integration</small>
            <strong>Connect an MCP client</strong>
            <span>Add historical chat search to Claude Code, Codex, or another client.</span>
          </DocsLink>
          <DocsLink to="/self-hosting/deployment/">
            <small>Optional cloud</small>
            <strong>Self-host the dashboard</strong>
            <span>Run PostgreSQL locally or deploy the service to Railway.</span>
          </DocsLink>
        </div>
      </section>
    </div>
  );
}

function InstallationPage() {
  return (
    <>
      <PageIntro
        eyebrow="Get started"
        title="Installation"
        description="Install Mimir globally with npm and verify that its local native dependencies match your Node.js runtime."
      />
      <Section id="requirements" title="Requirements">
        <ul>
          <li>Node.js 20 or newer</li>
          <li>npm</li>
          <li>Local chat history from Claude Code, Codex, or Cursor</li>
        </ul>
        <Callout title="No OpenAI subscription required">
          Mimir defaults to deterministic local development embeddings. An OpenAI API key is
          optional and only needed when you choose the OpenAI embedding provider.
        </Callout>
      </Section>
      <Section id="install-from-npm" title="Install from npm">
        <CodeBlock>npm install --global mimir-chat-index</CodeBlock>
        <p>
          The registry package is named <code>mimir-chat-index</code>. It installs the shorter{" "}
          <code>mimir</code> command.
        </p>
      </Section>
      <Section id="verify" title="Verify the installation">
        <CodeBlock>{`mimir --version
mimir doctor`}</CodeBlock>
        <p>
          The doctor checks Node.js, the local Mimir directory, SQLite, sqlite-vec, and native
          dependency compatibility.
        </p>
      </Section>
      <Section id="upgrade" title="Upgrade Mimir">
        <CodeBlock>npm install --global mimir-chat-index@latest</CodeBlock>
        <p>Run <code>mimir doctor</code> again after changing Node.js versions or upgrading Mimir.</p>
      </Section>
      <NextSteps
        links={[
          {
            to: "/guide/quick-start/",
            title: "Quick start",
            description: "Create your index and search the first conversation.",
          },
          {
            to: "/help/troubleshooting/",
            title: "Troubleshooting",
            description: "Fix Node.js and native SQLite installation problems.",
          },
        ]}
      />
    </>
  );
}

function QuickStartPage() {
  return (
    <>
      <PageIntro
        eyebrow="Get started"
        title="Quick start"
        description="Create a private local index, import supported AI chat history, and retrieve a past decision."
      />
      <Steps>
        <Step title="Initialize Mimir">
          <p>Create the private local data directory and SQLite database.</p>
          <CodeBlock>mimir init</CodeBlock>
        </Step>
        <Step title="Index your conversations">
          <p>Discover all supported sources in their standard local locations.</p>
          <CodeBlock>mimir sync --source all</CodeBlock>
          <p>You can sync one source by replacing <code>all</code> with <code>claude</code>, <code>codex</code>, or <code>cursor</code>.</p>
        </Step>
        <Step title="Search the index">
          <CodeBlock>mimir query "what did we decide about authentication?"</CodeBlock>
          <p>Results include the matched content, source, session, workspace, timestamp, and score.</p>
        </Step>
        <Step title="Check local status">
          <CodeBlock>mimir status</CodeBlock>
          <p>Status reports indexed message counts, searchable chunks, embedding mode, and cloud login state.</p>
        </Step>
      </Steps>
      <Callout title="Sync is incremental">
        Running sync again discovers new messages without duplicating content already present in the local index.
      </Callout>
      <NextSteps
        links={[
          {
            to: "/guide/search/",
            title: "Search and filters",
            description: "Narrow results to one source, session, workspace, or date range.",
          },
          {
            to: "/integrations/mcp/",
            title: "Connect MCP",
            description: "Let your AI assistant search Mimir directly.",
          },
        ]}
      />
    </>
  );
}

function SearchPage() {
  return (
    <>
      <PageIntro
        eyebrow="Get started"
        title="Search"
        description="Start with what you remember, then combine filters to locate a specific conversation."
      />
      <Section id="natural-language-search" title="Natural-language search">
        <CodeBlock>mimir query "the database migration where we discussed rollback"</CodeBlock>
        <p>
          Mimir embeds the sanitized query with the configured provider and compares it with locally indexed chunks.
        </p>
      </Section>
      <Section id="filter-results" title="Filter results">
        <CodeBlock>{`mimir query "pricing bug" --source claude --since 2026-06-01
mimir query "auth flow" --workspace /path/to/project
mimir query "release plan" --session SESSION_ID
mimir query "migration" --since 2026-06-01 --until 2026-07-01`}</CodeBlock>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Filter</th><th>Use it when</th></tr></thead>
            <tbody>
              <tr><td><code>--source</code></td><td>You know which AI tool contained the conversation.</td></tr>
              <tr><td><code>--session</code></td><td>You want matches only from one exact chat session.</td></tr>
              <tr><td><code>--workspace</code></td><td>The conversation happened inside a known project.</td></tr>
              <tr><td><code>--since</code> / <code>--until</code></td><td>You remember the approximate date.</td></tr>
              <tr><td><code>--limit</code></td><td>You need more or fewer than the default five results.</td></tr>
            </tbody>
          </table>
        </div>
        <Callout title="Filters work without query-field tricks">
          Source, session, workspace, and date filters are applied as filters. You do not need to repeat their values in the search text.
        </Callout>
      </Section>
      <Section id="structured-output" title="Structured output">
        <CodeBlock>mimir query "release plan" --source codex --json</CodeBlock>
        <p>Use JSON output when feeding search results into scripts or other local tools.</p>
      </Section>
      <Section id="embedding-quality" title="Embedding quality">
        <p>
          The default <code>dev</code> provider is deterministic and requires no subscription. It validates the complete search path, but OpenAI embeddings provide better semantic ranking for production usage.
        </p>
        <DocsLink to="/reference/configuration/">Configure an embedding provider</DocsLink>
      </Section>
      <NextSteps
        links={[
          {
            to: "/reference/cli/",
            title: "CLI reference",
            description: "See every query option and supported timestamp format.",
          },
          {
            to: "/cloud/dashboard/",
            title: "Dashboard search",
            description: "Search uploaded memory through the browser.",
          },
        ]}
      />
    </>
  );
}

function McpPage() {
  return (
    <>
      <PageIntro
        eyebrow="Integrations"
        title="MCP integration"
        description="Expose local historical chat search to an MCP-compatible AI client over a private stdio process."
      />
      <Section id="tool-surface" title="Tool surface">
        <p>Mimir exposes one focused local tool:</p>
        <CodeBlock language="text">search_historical_chats</CodeBlock>
        <p>
          It accepts a query and optional source, session, workspace, role, date, and limit filters. The tool is search-only: it cannot sync chats, reset data, or read arbitrary local files.
        </p>
      </Section>
      <Section id="claude-code" title="Claude Code">
        <CodeBlock>claude mcp add mimir -- mimir mcp</CodeBlock>
        <p>Restart Claude Code if it was already running, then inspect its configured MCP servers.</p>
      </Section>
      <Section id="codex" title="Codex">
        <p>Add the server to <code>~/.codex/config.toml</code>:</p>
        <CodeBlock language="toml">{`[mcp_servers.mimir]
command = "mimir"
args = ["mcp"]`}</CodeBlock>
      </Section>
      <Section id="other-clients" title="Other MCP clients">
        <p>Configure a local stdio MCP server with:</p>
        <CodeBlock>mimir mcp</CodeBlock>
        <p>
          Keep stdout reserved for JSON-RPC. Mimir sends diagnostics to stderr so protocol traffic remains valid.
        </p>
      </Section>
      <Section id="authentication" title="Local authentication model">
        <Callout title="Private local process" type="security">
          Local MCP opens no public HTTP port and needs no bearer token. Its security boundary is your OS user account and the permissions on the local Mimir directory.
        </Callout>
        <p>
          Hosted MCP is a separate endpoint at <code>/mcp</code>. It requires cloud authentication and can search only memory uploaded for the authenticated user.
        </p>
      </Section>
      <NextSteps
        links={[
          {
            to: "/reference/security/",
            title: "Security model",
            description: "Review local and hosted trust boundaries.",
          },
          {
            to: "/help/troubleshooting/",
            title: "MCP troubleshooting",
            description: "Diagnose startup and native dependency errors.",
          },
        ]}
      />
    </>
  );
}

function CloudDashboardPage() {
  return (
    <>
      <PageIntro
        eyebrow="Cloud"
        title="Cloud dashboard"
        description="Upload sanitized memory to a Mimir deployment and search conversations from a signed-in browser."
      />
      <Callout title="The cloud is optional" type="security">
        Local indexing and MCP work without a hosted service. Uploads happen only when you configure a cloud URL and request an upload.
      </Callout>
      <Section id="sign-in" title="Sign in">
        <CodeBlock>mimir login --cloud-url https://mimir.example.com</CodeBlock>
        <p>
          The device flow displays an approval code and opens the dashboard. Approval signs the CLI and browser into the same Mimir user.
        </p>
      </Section>
      <Section id="upload" title="Sync and upload">
        <CodeBlock>mimir sync --source all --upload</CodeBlock>
        <p>Or inspect the pending upload before sending it:</p>
        <CodeBlock>{`mimir sync --source all
mimir upload --dry-run
mimir upload`}</CodeBlock>
        <p>The terminal reports upload progress by batch. Successfully uploaded chunks are tracked locally so later uploads remain incremental.</p>
      </Section>
      <Section id="browse" title="Browse and search">
        <p>Open <code>https://mimir.example.com/dashboard</code>. The dashboard provides:</p>
        <ul>
          <li>Overview counts and recent activity</li>
          <li>Conversation browsing with readable derived titles</li>
          <li>Hybrid full-text and semantic search</li>
          <li>Source, session, workspace, role, and date filters</li>
          <li>Memory export, deletion, and token-management actions</li>
        </ul>
      </Section>
      <Section id="hosted-mcp" title="Hosted MCP">
        <p>
          Hosted MCP is available at <code>https://mimir.example.com/mcp</code>. It requires a bearer token from the CLI login and exposes only <code>search_historical_chats</code>.
        </p>
      </Section>
      <NextSteps
        links={[
          {
            to: "/self-hosting/deployment/",
            title: "Deploy Mimir",
            description: "Run your own cloud service and dashboard.",
          },
          {
            to: "/reference/api/",
            title: "Cloud API",
            description: "Inspect the OpenAPI contract and authentication model.",
          },
        ]}
      />
    </>
  );
}

function SelfHostingPage() {
  return (
    <>
      <PageIntro
        eyebrow="Self-host"
        title="Self-hosting"
        description="Run the optional cloud API and dashboard with PostgreSQL and pgvector."
      />
      <Section id="local-cloud-development" title="Local cloud development">
        <CodeBlock>{`git clone https://github.com/DevSherKhan/Mimir.git
cd Mimir
cp .env.example .env
docker compose up -d postgres
npm ci
npm run build
npm start`}</CodeBlock>
        <div className="endpoint-list">
          <a href="http://localhost:3000/dashboard">Dashboard <code>/dashboard</code></a>
          <a href="http://localhost:3000/docs/">Swagger UI <code>/docs/</code></a>
          <a href="http://localhost:3000/openapi.json">OpenAPI <code>/openapi.json</code></a>
          <a href="http://localhost:3000/health">Health <code>/health</code></a>
        </div>
      </Section>
      <Section id="production-environment" title="Production environment">
        <CodeBlock language="env">{`DATABASE_URL=postgresql://...
NODE_ENV=production
HOST=0.0.0.0
MIMIR_EMBEDDING_PROVIDER=dev`}</CodeBlock>
        <p>
          The application applies registered PostgreSQL migrations at startup. A deployment becomes healthy after the database connects, migrations succeed, and <code>/health</code> responds successfully.
        </p>
        <Callout title="Production secret rules" type="warning">
          Keep <code>MIMIR_DEV_ACCESS_TOKEN</code> and <code>MIMIR_ALLOW_DEV_TOKEN</code> unset in production. Store database credentials and optional API keys as sealed platform secrets.
        </Callout>
      </Section>
      <Section id="railway" title="Deploy to Railway">
        <p>
          The repository includes <code>railway.json</code> and a production <code>Dockerfile</code>. Create a PostgreSQL service with pgvector, point <code>DATABASE_URL</code> at it, and deploy the repository.
        </p>
        <p>
          Railway supplies <code>PORT</code>. The configured health check is <code>/health</code>.
        </p>
      </Section>
      <Section id="operations" title="Operations checklist">
        <ul>
          <li>Enable database backups and practice a restore.</li>
          <li>Add continuous external monitoring for <code>/health</code>.</li>
          <li>Monitor CPU, memory, disk, deployments, and error logs.</li>
          <li>Rotate secrets by creating replacements before revoking old values.</li>
          <li>Review authenticated activity and audit logs.</li>
        </ul>
        <DocsLink to={`${repositoryUrl}/blob/main/OPERATIONS.md`}>Read the complete operations runbook</DocsLink>
      </Section>
      <NextSteps
        links={[
          {
            to: "/reference/configuration/",
            title: "Configuration",
            description: "Review every supported environment variable.",
          },
          {
            to: "/reference/api/",
            title: "API documentation",
            description: "Use Swagger and the OpenAPI contract.",
          },
        ]}
      />
    </>
  );
}

function ConfigurationPage() {
  return (
    <>
      <PageIntro
        eyebrow="Reference"
        title="Configuration"
        description="Configure the local CLI, embedding provider, cloud client, and hosted service through environment variables."
      />
      <Section id="local-and-cloud-client" title="Local and cloud client">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Variable</th><th>Purpose</th><th>Default</th></tr></thead>
            <tbody>
              <tr><td><code>MIMIR_HOME</code></td><td>Local database and credential directory</td><td><code>~/.mimir</code></td></tr>
              <tr><td><code>MIMIR_EMBEDDING_PROVIDER</code></td><td><code>dev</code> or <code>openai</code></td><td><code>dev</code></td></tr>
              <tr><td><code>OPENAI_API_KEY</code></td><td>Required only for OpenAI embeddings</td><td>—</td></tr>
              <tr><td><code>MIMIR_CLOUD_URL</code></td><td>Hosted Mimir API URL</td><td><code>https://api.mimir.cloud</code></td></tr>
            </tbody>
          </table>
        </div>
        <p>Non-local cloud URLs must use HTTPS. Localhost and <code>127.0.0.1</code> may use HTTP for development.</p>
      </Section>
      <Section id="hosted-service" title="Hosted service">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Variable</th><th>Purpose</th><th>Default</th></tr></thead>
            <tbody>
              <tr><td><code>DATABASE_URL</code></td><td>PostgreSQL connection string</td><td>Not configured</td></tr>
              <tr><td><code>HOST</code></td><td>Server bind address</td><td><code>0.0.0.0</code></td></tr>
              <tr><td><code>PORT</code></td><td>Server port</td><td><code>3000</code></td></tr>
              <tr><td><code>MIMIR_DOCS_ENABLED</code></td><td>Serve Swagger and OpenAPI</td><td><code>true</code></td></tr>
              <tr><td><code>NODE_ENV</code></td><td>Runtime environment</td><td>—</td></tr>
            </tbody>
          </table>
        </div>
        <p>Start local server configuration from the repository's <code>.env.example</code>.</p>
      </Section>
      <Section id="embedding-providers" title="Embedding providers">
        <CodeBlock language="env">{`# Subscription-free local mode
MIMIR_EMBEDDING_PROVIDER=dev

# Higher-quality semantic embeddings
MIMIR_EMBEDDING_PROVIDER=openai
OPENAI_API_KEY=your_api_key`}</CodeBlock>
        <Callout title="Choose before indexing" type="warning">
          Changing providers requires rebuilding the local index so query vectors and stored vectors use the same model.
        </Callout>
      </Section>
      <NextSteps
        links={[
          {
            to: "/reference/security/",
            title: "Security",
            description: "Learn which configuration values are sensitive.",
          },
          {
            to: "/self-hosting/deployment/",
            title: "Production deployment",
            description: "Apply this configuration to a hosted service.",
          },
        ]}
      />
    </>
  );
}

function CliPage() {
  return (
    <>
      <PageIntro
        eyebrow="Reference"
        title="CLI reference"
        description="The Mimir CLI manages the local index, search, MCP process, and optional cloud connection."
      />
      <Section id="local-index" title="Local index commands">
        <div className="command-grid">
          <CommandCard command="mimir init">Create the local directory and SQLite database.</CommandCard>
          <CommandCard command="mimir sync">Index supported local AI chat history.</CommandCard>
          <CommandCard command="mimir query <text>">Search indexed conversation chunks.</CommandCard>
          <CommandCard command="mimir status">Show index and cloud authentication status.</CommandCard>
          <CommandCard command="mimir doctor">Diagnose Node.js, SQLite, and native dependencies.</CommandCard>
          <CommandCard command="mimir reset-local">Clear indexed memory while preserving cloud login and install identity.</CommandCard>
        </div>
      </Section>
      <Section id="sync-options" title="Sync options">
        <CodeBlock>{`mimir sync [options]

--source <source>      all, claude, codex, cursor, or fixtures
--claude-dir <path>    Override the Claude Code JSONL directory
--codex-dir <path>     Override the Codex home directory
--cursor-dir <path>    Override Cursor workspaceStorage
--fixture-dir <path>   Read development fixtures
--upload               Upload pending sanitized chunks after sync`}</CodeBlock>
      </Section>
      <Section id="query-options" title="Query options">
        <CodeBlock>{`mimir query [options] <text>

--limit <number>       Maximum result count (default: 5)
--source <source>      claude, codex, cursor, or fixtures
--session <id>         Exact session id
--workspace <path>     Exact workspace path
--since <timestamp>    ISO date, Unix seconds, or milliseconds
--until <timestamp>    ISO date, Unix seconds, or milliseconds
--json                 Structured JSON output`}</CodeBlock>
      </Section>
      <Section id="cloud-commands" title="Cloud commands">
        <div className="command-grid">
          <CommandCard command="mimir login">Run device login or store an existing token.</CommandCard>
          <CommandCard command="mimir logout">Remove local cloud credentials.</CommandCard>
          <CommandCard command="mimir upload">Upload pending sanitized chunks in batches.</CommandCard>
          <CommandCard command="mimir cloud-smoke">Verify an authenticated cloud deployment.</CommandCard>
        </div>
        <CodeBlock>{`mimir upload --dry-run
mimir upload --limit 500 --batch-size 100
mimir upload --force`}</CodeBlock>
      </Section>
      <Section id="mcp-command" title="MCP command">
        <CodeBlock>mimir mcp</CodeBlock>
        <p>Starts the local JSON-RPC MCP server over stdio. Do not pipe unrelated stdout into this process.</p>
      </Section>
      <p>Use <code>mimir help &lt;command&gt;</code> for the authoritative options installed with your version.</p>
    </>
  );
}

function ApiPage() {
  return (
    <>
      <PageIntro
        eyebrow="Reference"
        title="API and OpenAPI"
        description="Inspect the hosted contract in Swagger UI and authenticate cloud memory operations with device-login credentials."
      />
      <Section id="interactive-documentation" title="Interactive documentation">
        <p>On a running Mimir service:</p>
        <ul>
          <li><code>/docs/</code> serves Swagger UI.</li>
          <li><code>/openapi.json</code> serves the OpenAPI 3.1 contract.</li>
          <li><code>/health</code> provides the unauthenticated health check.</li>
        </ul>
        <CodeBlock language="env">MIMIR_DOCS_ENABLED=false</CodeBlock>
        <p>Disable the documentation surface when required by your deployment policy.</p>
      </Section>
      <Section id="authentication" title="Authentication">
        <p>
          Protected endpoints accept a bearer token issued by the CLI device flow or the HttpOnly dashboard session cookie. Do not paste production tokens into a shared browser.
        </p>
        <CodeBlock>{`mimir login --cloud-url https://mimir.example.com
mimir status`}</CodeBlock>
      </Section>
      <Section id="resource-groups" title="Resource groups">
        <div className="api-groups">
          <article><strong>Authentication</strong><span>Device start, completion, logout, and token revocation.</span></article>
          <article><strong>Memory</strong><span>Batch upload, count, browse, search, export, and deletion.</span></article>
          <article><strong>Conversations</strong><span>Paginated conversation summaries and chronological detail.</span></article>
          <article><strong>Operations</strong><span>Health, audit events, and authenticated hosted MCP.</span></article>
        </div>
      </Section>
      <Section id="example-request" title="Example request">
        <CodeBlock>{`curl --fail \
  -H "Authorization: Bearer YOUR_TOKEN" \
  "https://mimir.example.com/v1/memories/search?query=database%20migration&limit=5"`}</CodeBlock>
      </Section>
      <Section id="contract-changes" title="Contract changes">
        <p>
          The source contract lives in <code>src/server/openapi/document.ts</code>. API changes must update the contract and its tests in the same pull request.
        </p>
      </Section>
    </>
  );
}

function SecurityPage() {
  return (
    <>
      <PageIntro
        eyebrow="Reference"
        title="Privacy and security"
        description="Mimir keeps local operation private by default and makes cloud transfer an explicit user action."
      />
      <Section id="local-first-boundary" title="Local-first boundary">
        <ul>
          <li>Chat history stays on your machine until you explicitly upload.</li>
          <li>External chat databases are opened read-only or copied before parsing.</li>
          <li>Local files receive private permissions where the operating system supports them.</li>
          <li>Local MCP opens no public network port.</li>
        </ul>
      </Section>
      <Section id="redaction" title="Redaction">
        <p>
          Common secret patterns are redacted before content is stored, embedded, or uploaded. Redaction reduces accidental exposure but is not a substitute for reviewing what you send to a hosted service.
        </p>
        <Callout title="Never share Mimir data files" type="warning">
          Do not commit or attach <code>~/.mimir</code>, <code>vault.db</code>, <code>cloud-auth.json</code>, chat exports, database URLs, or access tokens.
        </Callout>
      </Section>
      <Section id="local-storage" title="Local storage">
        <p>The default directory is <code>~/.mimir</code>. It contains:</p>
        <ul>
          <li><code>vault.db</code> — sanitized messages, searchable chunks, vectors, and upload state</li>
          <li><code>install.json</code> — local installation identity</li>
          <li><code>cloud-auth.json</code> — cloud credentials after login</li>
        </ul>
      </Section>
      <Section id="hosted-security" title="Hosted security">
        <p>
          Cloud data is scoped to the authenticated user. The browser uses an HttpOnly, same-site session cookie, while CLI and hosted MCP requests use bearer tokens.
        </p>
        <p>
          The hosted MCP surface remains search-only. It cannot trigger local ingestion, reset a user's machine, or read arbitrary files.
        </p>
      </Section>
      <Section id="reporting" title="Report a vulnerability">
        <p>
          Do not open a public issue for a suspected vulnerability. Follow the private reporting process in the repository security policy.
        </p>
        <DocsLink to={`${repositoryUrl}/security/policy`}>Read the security policy</DocsLink>
      </Section>
    </>
  );
}

function TroubleshootingPage() {
  return (
    <>
      <PageIntro
        eyebrow="Help"
        title="Troubleshooting"
        description="Start with Mimir's built-in diagnostics, then apply the focused fix for your symptom."
      />
      <Section id="run-doctor" title="Run diagnostics">
        <CodeBlock>{`mimir doctor
mimir status`}</CodeBlock>
        <p>Include sanitized doctor output when asking for support. Never include tokens, chat content, or environment-file contents.</p>
      </Section>
      <Section id="native-module" title="Native SQLite module mismatch">
        <p>
          A <code>NODE_MODULE_VERSION</code> or “module did not self-register” error means <code>better-sqlite3</code> was installed with a different Node.js runtime.
        </p>
        <CodeBlock>{`npm uninstall --global mimir-chat-index
npm install --global mimir-chat-index
mimir doctor`}</CodeBlock>
        <p>For repository development, run:</p>
        <CodeBlock>{`nvm use
npm rebuild
npm run build`}</CodeBlock>
      </Section>
      <Section id="no-search-results" title="No search results">
        <ul>
          <li>Run <code>mimir status</code> and confirm messages and chunks are indexed.</li>
          <li>Sync the expected source explicitly, such as <code>mimir sync --source codex</code>.</li>
          <li>Clear overly specific session or workspace filters.</li>
          <li>Use an exact term from the conversation when running with development embeddings.</li>
        </ul>
      </Section>
      <Section id="database-not-configured" title="Database is not configured">
        <p>
          The hosted API and dashboard require <code>DATABASE_URL</code>. Start the included PostgreSQL service and copy the example environment file:
        </p>
        <CodeBlock>{`cp .env.example .env
docker compose up -d postgres
npm run build
npm start`}</CodeBlock>
      </Section>
      <Section id="dashboard-assets" title="Dashboard assets return 404">
        <p>
          Build the dashboard before starting the production server. The server expects the generated asset manifest under <code>dist-dashboard</code>.
        </p>
        <CodeBlock>{`npm run build
npm start`}</CodeBlock>
        <p>Hard-refresh the browser after a deployment so it stops requesting asset hashes from an older build.</p>
      </Section>
      <Section id="upload-problems" title="Upload problems">
        <ul>
          <li>Confirm <code>mimir status</code> shows a cloud login.</li>
          <li>Run <code>mimir upload --dry-run</code> to inspect pending chunks.</li>
          <li>Check that the cloud URL uses HTTPS unless it is localhost.</li>
          <li>Verify the hosted service's <code>/health</code> endpoint.</li>
        </ul>
      </Section>
      <Section id="get-help" title="Get help">
        <DocsLink to="https://github.com/DevSherKhan/Mimir/discussions">Ask in GitHub Discussions</DocsLink>
        <span> or </span>
        <DocsLink to="https://github.com/DevSherKhan/Mimir/issues">open an issue</DocsLink>
        <p>Security reports must follow the private process in the security policy.</p>
      </Section>
    </>
  );
}

function ContributingPage() {
  return (
    <>
      <PageIntro
        eyebrow="Community"
        title="Contributing"
        description="Contribute focused, tested changes while preserving Mimir's local-first privacy model."
      />
      <Section id="development-setup" title="Development setup">
        <CodeBlock>{`git clone https://github.com/DevSherKhan/Mimir.git
cd Mimir
nvm use
cp .env.example .env
npm ci
npm run check`}</CodeBlock>
        <p>PostgreSQL with pgvector is required only for cloud integration work.</p>
      </Section>
      <Section id="development-commands" title="Development commands">
        <CodeBlock>{`npm run dev -- sync --source all
npm run dev -- query "database migration"
npm run dev:server
npm run dev:dashboard
npm run dev:docs`}</CodeBlock>
      </Section>
      <Section id="pull-requests" title="Pull requests">
        <ol>
          <li>Open an issue first for significant behavior, schema, API, or security changes.</li>
          <li>Keep changes focused and add regression coverage.</li>
          <li>Run <code>npm run check</code> before submitting.</li>
          <li>Update docs, OpenAPI, migrations, and operations guidance when relevant.</li>
          <li>Never commit histories, tokens, database files, or generated credentials.</li>
        </ol>
      </Section>
      <Section id="commit-style" title="Commit style">
        <p>Use a concise imperative subject, preferably following Conventional Commits:</p>
        <CodeBlock language="text">{`feat: add conversation export
fix: preserve upload progress after retry
docs: explain local Postgres setup`}</CodeBlock>
      </Section>
      <Section id="database-migrations" title="Database migrations">
        <Callout title="Migrations are append-only" type="warning">
          Add a new numbered SQL file and register it in <code>src/cloud/db/migrator.ts</code>. Never rewrite a migration that may already have been applied.
        </Callout>
      </Section>
      <Section id="project-policies" title="Project policies">
        <ul>
          <li><DocsLink to={`${repositoryUrl}/blob/main/CONTRIBUTING.md`}>Contributing guide</DocsLink></li>
          <li><DocsLink to={`${repositoryUrl}/blob/main/CODE_OF_CONDUCT.md`}>Code of Conduct</DocsLink></li>
          <li><DocsLink to={`${repositoryUrl}/blob/main/GOVERNANCE.md`}>Governance</DocsLink></li>
          <li><DocsLink to={`${repositoryUrl}/blob/main/LICENSE`}>ISC license</DocsLink></li>
        </ul>
      </Section>
    </>
  );
}

function NotFoundPage() {
  return (
    <div className="not-found">
      <span>404</span>
      <h1>Documentation page not found</h1>
      <p>The page may have moved, or the URL may be incomplete.</p>
      <DocsLink className="button button-primary" to="/">Return to documentation</DocsLink>
    </div>
  );
}
