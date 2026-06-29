# Mimir Product Plan: Local Agent + Cloud MCP

## Summary

Mimir should be built as a local memory agent plus an optional cloud MCP service.

The local agent runs on each user's machine, reads local AI chat history from Claude Code, Codex, Cursor, and supported exports, redacts sensitive content, chunks and embeds the text, then stores it locally or uploads sanitized memory records to Mimir Cloud.

Mimir Cloud stores per-user searchable memory and exposes a remote MCP endpoint that Claude, Cursor, Codex, ChatGPT-style clients, or other MCP clients can query.

Core principle:

```text
Local agent collects private local data.
Cloud service stores/searches sanitized per-user memory.
MCP clients query memory through a search-only interface.
```

## Architecture

```text
User Laptop
  mimir agent
    - reads Claude/Codex/Cursor local logs
    - imports supported ChatGPT/Claude exports
    - redacts secrets
    - chunks messages
    - creates embeddings
    - stores locally and/or uploads sanitized records
        |
        v
Mimir Cloud
  API + database
    - authenticates users
    - stores per-user chunks/vectors
    - enforces tenant isolation
    - exposes hosted MCP search
        |
        v
AI Clients
  Claude / Cursor / Codex / ChatGPT-style clients
    - call search_historical_chats
```

## Local Agent

- Keep the current TypeScript CLI as the local agent foundation.
- Continue supporting local-only usage with:
  - `mimir init`
  - `mimir sync --source all`
  - `mimir query "<text>"`
  - `mimir mcp`
- Add cloud-oriented commands:
  - `mimir login`
  - `mimir logout`
  - `mimir upload`
  - `mimir status`
  - `mimir sync --source all --upload`
- Supported local sources:
  - Claude Code JSONL transcripts.
  - Codex session JSONL, history, and session index records from `~/.codex`.
  - Cursor SQLite workspace state, read-only and best-effort.
  - User-supplied exports, such as ChatGPT export files, when available.
- Never let the cloud service directly scrape local machine files.

## Upload Contract

The local agent should upload sanitized chunk records, not raw full transcripts.

Initial upload payload:

```json
{
  "sourceTool": "codex",
  "workspacePath": "/repo/path",
  "sessionId": "session-id",
  "role": "user",
  "timestamp": 1782700000000,
  "content": "redacted chunk text",
  "contentHash": "sha256...",
  "embeddingProvider": "dev",
  "embeddingModel": "mimir-dev-hash-v1",
  "embedding": [0.01, 0.02]
}
```

Rules:

- Redact secrets before local storage, embedding, or upload.
- Use content hashes for deduplication.
- Store embeddings per chunk.
- Keep enough metadata to filter by source, session, workspace, and timestamp.
- Allow re-embedding later when switching from development embeddings to production embeddings.

## Cloud Service

Recommended v1 stack:

- API: Node.js with Fastify or similar.
- Database: Postgres with `pgvector`.
- Auth: Clerk, Supabase Auth, Auth.js, or device-code auth for CLI login.
- Hosting: Fly.io first choice; Railway or Render as simpler alternatives.
- MCP transport: remote HTTP MCP endpoint.

Initial cloud API:

- `POST /v1/auth/device/start`
- `POST /v1/auth/device/complete`
- `POST /v1/memories/batch`
- `GET /v1/memories/search`
- `POST /mcp`

Cloud MCP tool:

- `search_historical_chats`
  - input: query string, optional limit, optional source filters
  - output: matched snippets with source, timestamp, session id, and score

The hosted MCP endpoint should be search-only in v1. Do not expose sync, reset, local file reads, or ingestion controls through remote MCP.

## Security Requirements

- User authentication required for all cloud APIs.
- Strong per-user tenant isolation.
- HTTPS only.
- Bearer tokens or OAuth for hosted MCP access.
- Secret redaction before upload.
- No cross-user search.
- No public unauthenticated MCP endpoint.
- Rate limits on upload and search.
- Audit logs for login, upload, and MCP search.
- User data export and deletion.
- Encrypted database backups.
- Local database permissions should remain private: `~/.mimir` should be `0700`, `vault.db` should be `0600` where supported.

## Implementation Phases

### Phase 1: Harden Local MCP

- Keep local SQLite storage and deterministic development embeddings.
- Stabilize `mimir init`, `sync`, `query`, and `mcp`.
- Add better MCP result formatting.
- Add parser tests for Claude Code, Codex, Cursor, and fixtures.
- Document Cursor, Claude, and Codex MCP setup.

### Phase 2: Cloud Upload Foundation

- Add user auth and local credential storage.
- Add `mimir login`, `logout`, `status`, and `upload`.
- Add batch upload API and Postgres schema.
- Upload sanitized chunks and embeddings.
- Keep cloud uploads explicit at first.

### Phase 3: Hosted MCP Search

- Add remote HTTP MCP endpoint.
- Implement `search_historical_chats` against Postgres + pgvector.
- Require bearer auth.
- Add source filters and result limits.
- Add basic audit logs and rate limits.

### Phase 4: Product Distribution

- Publish the local agent as an npm package.
- Provide install snippets for Cursor, Claude Code, and Codex.
- Add one-command local setup:
  - `mimir init`
  - `mimir login`
  - `mimir sync --source all --upload`
- Add docs for local-only mode and cloud mode.

## Assumptions

- The realistic product path is not cloud-only. Local chat data lives on user machines, so a local collector is required.
- Mimir Cloud should store sanitized memory records, not raw complete chat logs.
- Local-only mode remains valuable and should continue working.
- Cursor ingestion remains best-effort because Cursor storage details may change.
- Hosted MCP starts as search-only to keep the security model narrow.
