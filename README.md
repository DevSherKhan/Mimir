# Mimir

Mimir is a local-first AI chat memory index. It ingests local chat logs, chunks and embeds them, stores vectors in SQLite, and exposes search through a CLI and MCP server.

The MVP works without an OpenAI subscription by defaulting to deterministic development embeddings. These are useful for testing the pipeline, but they are not true semantic embeddings.

## Commands

```bash
npm install
npm run build
npm run dev -- init
npm run dev -- sync --source fixtures
npm run dev -- sync --source codex
npm run dev -- query "database migration"
npm run dev -- status
npm run dev -- upload --dry-run
npm run dev -- mcp
npm run dev -- doctor
```

Search can be filtered:

```bash
npm run dev -- query "database migration" --source codex
npm run dev -- query "pricing bug" --source claude --since 2026-06-01
npm run dev -- query "auth flow" --workspace /home/me/project --json
```

## Install the `mimir` Command Locally

During development, link this project into your shell:

```bash
npm install
npm run build
npm link
```

Then run Mimir directly:

```bash
mimir help
mimir init
mimir sync --source fixtures
mimir sync --source codex
mimir query "database migration"
mimir status
mimir upload --dry-run
mimir mcp
mimir doctor
```

You can also inspect a specific command:

```bash
mimir help sync
mimir help query
```

If you change TypeScript source files, rebuild before using the linked `mimir` command again:

```bash
npm run build
```

## Configuration

- `MIMIR_HOME`: overrides `~/.mimir`.
- `MIMIR_EMBEDDING_PROVIDER`: `dev` or `openai`. Defaults to `dev`.
- `OPENAI_API_KEY`: required only when `MIMIR_EMBEDDING_PROVIDER=openai`.
- `MIMIR_CLOUD_URL`: hosted Mimir API URL. Defaults to `https://api.mimir.cloud`. HTTPS is required except for localhost development.

## Ingestion Sources

- `mimir sync --source claude`: reads Claude Code JSONL transcripts.
- `mimir sync --source codex`: reads Codex session JSONL, history, and session index records from `~/.codex`.
- `mimir sync --source cursor`: reads Cursor workspace SQLite state read-only.
- `mimir sync --source all`: reads Claude Code, Codex, and Cursor.
- `mimir sync --source fixtures`: reads only local test fixtures.

## Cloud Upload Mode

Cloud mode is opt-in. The local agent still does all local file reading, redaction, chunking, and embedding. Mimir Cloud receives sanitized chunk records only; it never reads Claude, Codex, Cursor, or ChatGPT files directly from a user's machine.

Login with a bearer token during early development:

```bash
mimir login --cloud-url https://api.mimir.cloud --token YOUR_TOKEN
```

For localhost development:

```bash
mimir login --cloud-url http://localhost:3000 --token dev-token
```

Check local database and upload status:

```bash
mimir status
mimir status --json
```

Upload pending chunks explicitly:

```bash
mimir upload --dry-run
mimir upload
```

Or sync and upload in one command:

```bash
mimir sync --source all --upload
```

Upload behavior:

- Stored credentials live at `~/.mimir/cloud-auth.json` with private permissions where supported.
- Uploads default to the cloud URL used during login.
- `--cloud-url` on `mimir upload` intentionally overrides the login URL.
- Already uploaded chunks are tracked locally by cloud URL and content hash.
- Raw external chat databases are never modified and never uploaded wholesale.

## MCP Tool

Mimir exposes one local MCP tool:

```text
search_historical_chats
```

Inputs:

- `query`: search text.
- `limit`: optional result count, from 1 to 20.
- `sourceTool`: optional source filter: `claude`, `claude-code`, `codex`, `cursor`, `fixture`, or `fixtures`.
- `sessionId`: optional session filter.
- `workspacePath`: optional workspace path filter.
- `since`: optional ISO date, Unix seconds, or Unix milliseconds.
- `until`: optional ISO date, Unix seconds, or Unix milliseconds.

Output includes matched snippets with source, role, session id, workspace path, timestamp, score, distance, and content.

## Security Defaults

- External chat databases are opened read-only or copied before parsing.
- Codex ingestion reads session/history files only and skips internal metadata records.
- Secrets are redacted before text is stored or embedded.
- App data is created with private permissions where the OS allows it.
- MCP mode reserves stdout for JSON-RPC and sends diagnostics to stderr.

## MCP Auth Model

Mimir currently supports a local stdio MCP server:

```bash
mimir mcp
```

Claude Code and Codex start that command as a local child process. There is no public HTTP port, so there is no bearer-token or OAuth login layer in the current architecture. The security boundary is your local OS user account plus the private Mimir database permissions.

Recommended setup:

```bash
chmod 700 ~/.mimir
chmod 600 ~/.mimir/vault.db
```

For Claude Code:

```bash
claude mcp add mimir -- mimir mcp
```

For Codex, add this to `~/.codex/config.toml`:

```toml
[mcp_servers.mimir]
command = "mimir"
args = ["mcp"]
```

Do not expose `mimir mcp` through a public HTTP wrapper. Hosted MCP should use the cloud architecture: HTTPS, bearer/OAuth auth, tenant isolation, and a search-only API surface.

The Phase 2 cloud upload contract is represented by:

- `POST /v1/auth/device/start`
- `POST /v1/auth/device/complete`
- `POST /v1/memories/batch`
- `cloud/schema.sql` for the initial Postgres + pgvector schema.

## Troubleshooting MCP Startup

If Claude, Codex, Cursor, or another MCP client reports:

```text
Connection failed: MCP error -32000: Connection closed
The module ... was compiled against a different Node.js version
```

then `mimir mcp` is crashing before the MCP handshake. This usually happens when `better-sqlite3` was installed with one Node version but the MCP client starts Mimir with another Node version.

Use one Node 20+ binary consistently:

```bash
node --version
which node
mimir doctor
```

If Node comes from Snap, install Node 20+ another way such as `nvm`, then rebuild:

```bash
cd /home/sher-khan/Projects/Mimir
rm -rf node_modules package-lock.json
npm install
npm run build
npm link
npm rebuild better-sqlite3
```

If the MCP client cannot find the same `node` binary, configure the MCP server with absolute paths:

```json
{
  "mcpServers": {
    "mimir": {
      "command": "/absolute/path/to/node",
      "args": ["/home/sher-khan/Projects/Mimir/dist/cli.js", "mcp"]
    }
  }
}
```

You can generate a config snippet using the exact Node binary that is running Mimir:

```bash
mimir doctor --mcp-json
```
