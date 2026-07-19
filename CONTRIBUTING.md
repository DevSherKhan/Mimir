# Contributing to Mimir

Thank you for improving Mimir. Contributions should preserve its local-first privacy model: source chat files are read on the user's machine, secrets are redacted before storage or upload, and the hosted MCP surface remains search-only.

## Development setup

Requirements:

- Node.js 20.20.2 (see `.nvmrc`)
- npm
- PostgreSQL with `vector` and `pgcrypto` for cloud integration work

```bash
nvm use
cp .env.example .env
npm ci
npm run check
```

Use `npm run dev -- <command>` for CLI development and `npm run dev:server` for the hosted API/dashboard. Swagger UI is available at `http://localhost:3000/docs/`.

## Pull requests

1. Open an issue first for significant behavior, schema, API, or security changes.
2. Keep changes focused and include tests for new behavior and regressions.
3. Run `npm run check` before submitting.
4. Update README, OpenAPI, migrations, and operations guidance when relevant.
5. Never commit chat histories, `.env`, tokens, database files, or generated credentials.

Database migrations are append-only after release. Add a new numbered SQL file and register it in `src/cloud/db/migrator.ts`; do not rewrite an applied migration.

## Commit style

Use a concise imperative subject, preferably following Conventional Commits:

```text
feat: add conversation export
fix: preserve upload progress after retry
docs: explain local Postgres setup
```

By contributing, you agree that your contribution is licensed under the repository's ISC license.

## Releases

Mimir follows [Semantic Versioning](https://semver.org/). Maintainers update `CHANGELOG.md`, run `npm run check`, review the package contents with `npm pack --dry-run`, tag the release, and publish from a clean protected branch. Never publish from a working tree containing local credentials or chat data.
