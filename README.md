# Mimir

[![CI](https://github.com/DevSherKhan/Mimir/actions/workflows/ci.yml/badge.svg)](https://github.com/DevSherKhan/Mimir/actions/workflows/ci.yml)
[![CodeQL](https://github.com/DevSherKhan/Mimir/actions/workflows/codeql.yml/badge.svg)](https://github.com/DevSherKhan/Mimir/actions/workflows/codeql.yml)
[![License: ISC](https://img.shields.io/badge/license-ISC-blue.svg)](LICENSE)
[![Documentation](https://img.shields.io/badge/docs-online-176b50.svg)](https://devsherkhan.github.io/Mimir/)

Mimir gives your AI coding tools a searchable memory of past conversations. It indexes local Claude Code, Codex, and Cursor chats, redacts common secrets, and exposes search through a CLI and a local MCP server.

Mimir is local-first: your chat history stays on your machine.

## Links

- Documentation: [devsherkhan.github.io/Mimir](https://devsherkhan.github.io/Mimir/)
- GitHub: [github.com/DevSherKhan/Mimir](https://github.com/DevSherKhan/Mimir)

## Features

- Search conversations across Claude Code, Codex, and Cursor.
- Filter results by source, session, workspace, and date.
- Give MCP-compatible assistants one search-only tool: `search_historical_chats`.
- One-command MCP setup for Claude Code, Codex, and Cursor.
- Run without an OpenAI API key using deterministic local embeddings.

## Requirements

- Node.js 20 or newer
- npm

## Install

```bash
npm install --global mimir-chat-index
```

The package is named `mimir-chat-index`; the installed command is `mimir`.

```bash
mimir --version
mimir doctor
```

## Quick start

```bash
mimir init
mimir sync --source all
mimir add-mcp --all
```

Then ask your AI tool something like: “What did we decide about authentication?”

You can also search from the terminal:

```bash
mimir query "what did we decide about authentication?"
```

Index one source at a time when you want:

```bash
mimir sync --source codex
mimir sync --source claude
mimir sync --source cursor
```

Cursor ingest is best-effort because Cursor storage formats change. Claude Code and Codex session logs are the most reliable sources.

Run `mimir status` to see the local index.

## Search

```bash
mimir query "database migration"
mimir query "pricing bug" --source claude --since 2026-06-01
mimir query "auth flow" --workspace /path/to/project
mimir query "release plan" --session SESSION_ID --json
```

| Option | Purpose |
| --- | --- |
| `--limit <number>` | Maximum number of results |
| `--source <source>` | `claude`, `codex`, `cursor`, or `fixtures` |
| `--session <id>` | Search within one session |
| `--workspace <path>` | Search within one workspace |
| `--since <timestamp>` | Results after a date or Unix timestamp |
| `--until <timestamp>` | Results before a date or Unix timestamp |
| `--json` | Structured JSON output |

## Connect an MCP client

Mimir exposes one local MCP tool:

```text
search_historical_chats
```

The tool accepts a query plus optional source, session, workspace, date, and result-limit filters. It is search-only and cannot modify local files or re-index conversations.

Easiest setup:

```bash
mimir add-mcp --all
```

Or configure one tool:

```bash
mimir add-mcp --claude
mimir add-mcp --codex
mimir add-mcp --cursor
```

Manual setup:

```bash
# Claude Code
claude mcp add mimir -- mimir mcp

# Codex (preferred CLI helper)
codex mcp add mimir -- mimir mcp

# Cursor: add to ~/.cursor/mcp.json
{
  "mcpServers": {
    "mimir": {
      "command": "mimir",
      "args": ["mcp"]
    }
  }
}
```

Codex can also be configured by editing `~/.codex/config.toml`:

```toml
[mcp_servers.mimir]
command = "mimir"
args = ["mcp"]
```

After changing Codex config, start a new Codex session. Confirm with `codex mcp list`. `mimir` must be on your PATH.

Or run the server yourself:

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
| `mimir add-mcp` | Configure MCP in Claude Code, Codex, and/or Cursor |
| `mimir status` | Show local index status |
| `mimir doctor` | Diagnose the local installation |
| `mimir reset-local` | Reset local Mimir data |

Run `mimir help <command>` for command options.

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

## Configuration

| Variable | Description | Default |
| --- | --- | --- |
| `MIMIR_HOME` | Local data directory | `~/.mimir` |
| `MIMIR_EMBEDDING_PROVIDER` | `dev` or `openai` | `dev` |
| `OPENAI_API_KEY` | Required for OpenAI embeddings | — |

## Privacy and security

- Chat data stays local on your machine.
- Common secret patterns are redacted before content is stored or embedded.
- External chat databases are opened read-only or copied before parsing.
- Local Mimir files use private permissions where the operating system supports them.
- MCP diagnostics go to stderr so stdout remains reserved for JSON-RPC.

The local database lives under `~/.mimir` by default. Do not commit or share that directory. Report vulnerabilities privately using [SECURITY.md](SECURITY.md).

## Development

```bash
git clone https://github.com/DevSherKhan/Mimir.git
cd Mimir
nvm use
npm ci
npm run check
```

Run commands from TypeScript during development:

```bash
npm run dev -- sync --source all
npm run dev -- query "database migration"
npm run dev -- mcp
npm run dev -- add-mcp --all
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow.

Cloud API, dashboard, and self-hosting code remains in the repository as experimental/frozen work and is not part of the supported user install path. See [OPERATIONS.md](OPERATIONS.md) if you explore that surface.

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

```bash
mimir help
mimir help sync
mimir help add-mcp
```

## Community

Mimir is open source under the [ISC license](LICENSE).

- [Contributing guide](CONTRIBUTING.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Security policy](SECURITY.md)
- [Governance](GOVERNANCE.md)
- [Changelog](CHANGELOG.md)
