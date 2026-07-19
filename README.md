# Mimir

[![CI](https://github.com/DevSherKhan/Mimir/actions/workflows/ci.yml/badge.svg)](https://github.com/DevSherKhan/Mimir/actions/workflows/ci.yml)
[![CodeQL](https://github.com/DevSherKhan/Mimir/actions/workflows/codeql.yml/badge.svg)](https://github.com/DevSherKhan/Mimir/actions/workflows/codeql.yml)
[![License: ISC](https://img.shields.io/badge/license-ISC-blue.svg)](LICENSE)
[![Documentation](https://img.shields.io/badge/docs-online-176b50.svg)](https://devsherkhan.github.io/Mimir/)

Mimir gives your AI coding tools a searchable memory of past conversations. It indexes local Claude Code, Codex, and Cursor chats, redacts common secrets, and exposes the results through a CLI, an MCP server, and an optional self-hosted dashboard.

Mimir is local-first: your chat history stays on your machine unless you explicitly configure and run a cloud upload.

Read the complete guides at [devsherkhan.github.io/Mimir](https://devsherkhan.github.io/Mimir/).

## Features

- Search conversations across Claude Code, Codex, and Cursor.
- Filter results by source, session, workspace, and date.
- Give MCP-compatible assistants access to a single search-only tool.
- Run without an OpenAI API key using deterministic local embeddings.
- Optionally upload sanitized chunks to your own hosted Mimir instance.
- Browse cloud conversations through a responsive web dashboard.
- Inspect and test the hosted API through OpenAPI and Swagger UI.

## Requirements

- Node.js 20 or newer
- npm
- PostgreSQL with pgvector only when self-hosting the cloud service

## Install

Install the npm package globally:

```bash
npm install --global mimir-chat-index
```

The package is named `mimir-chat-index`; the installed command is `mimir`.

```bash
mimir --version
mimir doctor
```

## Quick start

Create Mimir's private local data directory, index your chats, and search them:

```bash
mimir init
mimir sync --source all
mimir query "what did we decide about authentication?"
```

Mimir automatically discovers supported chat history in its standard locations. You can index one source at a time:

```bash
mimir sync --source codex
mimir sync --source claude
mimir sync --source cursor
```

Run `mimir status` to see the local index and authentication state.

## Search

Use natural-language queries and add filters when you need a specific conversation:

```bash
mimir query "database migration"
mimir query "pricing bug" --source claude --since 2026-06-01
mimir query "auth flow" --workspace /path/to/project
mimir query "release plan" --session SESSION_ID --json
```

Useful options:

| Option | Purpose |
| --- | --- |
| `--limit <number>` | Set the maximum number of results |
| `--source <source>` | Filter by `claude`, `codex`, `cursor`, or `fixtures` |
| `--session <id>` | Search within one session |
| `--workspace <path>` | Search within one workspace |
| `--since <timestamp>` | Include results after a date or Unix timestamp |
| `--until <timestamp>` | Include results before a date or Unix timestamp |
| `--json` | Return structured JSON |

Use `mimir help query` for the complete command reference.

## Connect an MCP client

Mimir exposes one local MCP tool:

```text
search_historical_chats
```

The tool accepts a query plus optional source, session, workspace, role, date, and result-limit filters. It is search-only and cannot modify local files or re-index conversations.

Add Mimir to Claude Code:

```bash
claude mcp add mimir -- mimir mcp
```

Add Mimir to Codex in `~/.codex/config.toml`:

```toml
[mcp_servers.mimir]
command = "mimir"
args = ["mcp"]
```

For another MCP client, configure a local stdio server that runs:

```bash
mimir mcp
```

Local MCP does not require a bearer token. The process runs under your OS user account and reads the private local Mimir database.

## Commands

| Command | Description |
| --- | --- |
| `mimir init` | Create the local Mimir data directory and database |
| `mimir sync` | Index local AI chat history |
| `mimir query <text>` | Search the local index |
| `mimir mcp` | Start the local MCP server over stdio |
| `mimir login` | Sign in to a hosted Mimir instance |
| `mimir upload` | Upload pending sanitized chunks |
| `mimir status` | Show local index and cloud authentication status |
| `mimir doctor` | Diagnose the local installation |
| `mimir logout` | Remove locally stored cloud credentials |
| `mimir reset-local` | Reset local Mimir data |

Run `mimir help <command>` to inspect a command and its options.

## Embeddings

Mimir defaults to deterministic development embeddings:

```env
MIMIR_EMBEDDING_PROVIDER=dev
```

This mode requires no OpenAI subscription or API key. It is suitable for local setup and functional search, but its semantic ranking is less accurate than a production embedding model.

To use OpenAI embeddings:

```env
MIMIR_EMBEDDING_PROVIDER=openai
OPENAI_API_KEY=your_api_key
```

Choose the provider before your first sync. Changing it later requires rebuilding the local index so every stored vector uses the same embedding model.

## Optional cloud dashboard

The cloud service is optional and self-hostable. Mimir sanitizes chat chunks locally before upload; uploads happen only when you request them.

Sign in to your deployment:

```bash
mimir login --cloud-url https://mimir.example.com
```

Then sync and upload:

```bash
mimir sync --source all --upload
```

You can also run the steps separately:

```bash
mimir sync --source all
mimir upload --dry-run
mimir upload
```

Open `https://mimir.example.com/dashboard` to browse conversations and search uploaded memory. The dashboard uses the same device-login flow as the CLI and stores its browser session in an HttpOnly cookie.

Hosted MCP is available at `https://mimir.example.com/mcp` and requires a bearer token obtained through `mimir login`.

## Self-host Mimir

For local cloud development:

```bash
git clone https://github.com/DevSherKhan/Mimir.git
cd Mimir
cp .env.example .env
docker compose up -d postgres
npm ci
npm run build
npm start
```

The service is available at:

- Dashboard: [http://localhost:3000/dashboard](http://localhost:3000/dashboard)
- Swagger UI: [http://localhost:3000/docs/](http://localhost:3000/docs/)
- OpenAPI document: [http://localhost:3000/openapi.json](http://localhost:3000/openapi.json)
- Health check: [http://localhost:3000/health](http://localhost:3000/health)

The repository includes a `Dockerfile`, `compose.yaml`, and `railway.json`. See [OPERATIONS.md](OPERATIONS.md) for deployment configuration, migrations, backups, health checks, and incident procedures.

## Configuration

| Variable | Description | Default |
| --- | --- | --- |
| `MIMIR_HOME` | Local data directory | `~/.mimir` |
| `MIMIR_EMBEDDING_PROVIDER` | `dev` or `openai` | `dev` |
| `OPENAI_API_KEY` | Required for OpenAI embeddings | — |
| `MIMIR_CLOUD_URL` | Hosted Mimir API URL | `https://api.mimir.cloud` |
| `DATABASE_URL` | PostgreSQL connection string for the hosted service | — |
| `HOST` | Hosted service bind address | `0.0.0.0` |
| `PORT` | Hosted service port | `3000` |
| `MIMIR_DOCS_ENABLED` | Enable Swagger UI and the OpenAPI endpoint | `true` |

Copy [`.env.example`](.env.example) when running the hosted service locally. HTTPS is required for non-local cloud URLs.

## Privacy and security

- Chat data stays local until you explicitly upload it.
- Common secret patterns are redacted before content is stored, embedded, or uploaded.
- External chat databases are opened read-only or copied before parsing.
- Local Mimir files use private permissions where the operating system supports them.
- MCP diagnostics go to stderr so stdout remains reserved for JSON-RPC.
- Hosted search and memory endpoints require authenticated access.

The local database and cloud credentials live under `~/.mimir` by default. Do not commit or share that directory. Report vulnerabilities privately using [SECURITY.md](SECURITY.md).

## Development

```bash
git clone https://github.com/DevSherKhan/Mimir.git
cd Mimir
nvm use
npm ci
npm run check
```

Run commands directly from the TypeScript source during development:

```bash
npm run dev -- sync --source all
npm run dev -- query "database migration"
npm run dev -- mcp
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow and pull-request expectations.

## Troubleshooting

Start with:

```bash
mimir doctor
```

If a native dependency was installed under a different Node.js version, reinstall Mimir using the active Node 20+ environment:

```bash
npm uninstall --global mimir-chat-index
npm install --global mimir-chat-index
mimir doctor
```

If you are developing from source, run `nvm use`, `npm rebuild`, and `npm run build`.

For command-specific help:

```bash
mimir help
mimir help sync
mimir help query
```

## Community

Mimir is open source under the [ISC license](LICENSE).

- [Contributing guide](CONTRIBUTING.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Security policy](SECURITY.md)
- [Governance](GOVERNANCE.md)
- [Changelog](CHANGELOG.md)
