# Changelog

All notable changes to Mimir are documented here. This project follows [Semantic Versioning](https://semver.org/) and the structure recommended by [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

## [0.1.4] - 2026-10-11

### Added

- `mimir add-mcp` to configure local MCP in Claude Code, Codex, and Cursor.

### Changed

- Product focus is local-first: install, sync, query, local MCP, and `add-mcp`.
- Removed cloud CLI commands from the supported path (`login`, `logout`, `upload`, `cloud-smoke`, `sync --upload`).
- npm package now ships the local CLI/MCP runtime only.
- Docs and README emphasize the local user path; cloud/dashboard marked experimental/frozen.
- Docs: Codex MCP setup documents `codex mcp add mimir -- mimir mcp` plus `~/.codex/config.toml`.

## [0.1.3] - 2026-07-22

### Added

- OpenAPI 3.1 contract and self-hosted Swagger UI.
- Production Docker image, local pgvector Compose service, and safe environment template.
- CI, CodeQL, dependency review, Dependabot, issue forms, and community health files.
- Version-checked npm publishing through GitHub trusted publishing.
- Routed online documentation with local search, dark mode, static SEO metadata, and GitHub Pages deployment.

### Changed

- Server startup configuration is validated before listening.
- Production errors return request IDs without leaking internal exception details.
- Memory upload batches are limited to 500 chunks.
- Initial local-first CLI, ingestion, SQLite vector index, cloud API, hosted MCP endpoint, and dashboard.

[Unreleased]: https://github.com/DevSherKhan/Mimir/compare/v0.1.4...HEAD
[0.1.4]: https://github.com/DevSherKhan/Mimir/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/DevSherKhan/Mimir/releases/tag/v0.1.3
