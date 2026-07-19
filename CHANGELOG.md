# Changelog

All notable changes to Mimir are documented here. This project follows [Semantic Versioning](https://semver.org/) and the structure recommended by [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

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

[Unreleased]: https://github.com/DevSherKhan/Mimir/commits/main
