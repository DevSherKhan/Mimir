# Mimir Production Operations

This checklist covers the Railway settings that cannot be enforced by application code.

## Required service configuration

Configure the Mimir service with:

```text
DATABASE_URL=${{Postgres.DATABASE_URL}}
NODE_ENV=production
HOST=0.0.0.0
MIMIR_EMBEDDING_PROVIDER=dev
```

Railway supplies `PORT`. Keep `MIMIR_DEV_ACCESS_TOKEN` and `MIMIR_ALLOW_DEV_TOKEN` unset in production. If OpenAI embeddings are enabled later, store `OPENAI_API_KEY` as a sealed Railway variable.

The application applies PostgreSQL migrations during startup. A deployment becomes healthy only after the database connects, migrations succeed, and `/health` returns HTTP 200.

## Backups and recovery

1. In the PostgreSQL service's **Backups** tab, enable daily and weekly volume backups.
2. Enable point-in-time recovery for production when the plan and retention cost are acceptable.
3. Perform a restore drill at least quarterly. Restore into a separate service, verify Mimir counts and search, then delete the drill service.
4. Record the acceptable recovery point objective and recovery time objective before launch.

Railway references:

- [Volume backups](https://docs.railway.com/volumes/backups)
- [PostgreSQL point-in-time recovery](https://docs.railway.com/volumes/point-in-time-recovery)

## Monitoring and alerts

1. Create a Railway Observability dashboard for the production environment.
2. Add CPU, memory, disk, network, deployment, and error-log widgets.
3. Alert before saturation; initial warning thresholds of 80% for memory/disk and 85% for CPU are reasonable starting points, then tune them from real traffic.
4. Add an external continuous uptime check for `GET /health`. Railway's deployment healthcheck is a promotion gate, not continuous monitoring.
5. Review structured Fastify error logs after every deployment and retain them externally if the Railway plan's retention is insufficient.

Railway references:

- [Observability dashboard and monitors](https://docs.railway.com/observability)
- [Metrics](https://docs.railway.com/observability/metrics)
- [Logs and retention](https://docs.railway.com/observability/logs)

## Secret rotation

1. Create the replacement secret before revoking the old one.
2. Update the corresponding Railway variable and seal user-managed secrets.
3. Review and deploy Railway's staged variable changes.
4. Verify `/health`, device login, upload, dashboard, and hosted MCP.
5. Revoke the previous secret only after verification succeeds.

For user access tokens, use **Revoke All** in the dashboard, then sign in again. Never copy `.env`, `cloud-auth.json`, database URLs, or access tokens into logs or tickets.

Railway reference: [Variables and sealed secrets](https://docs.railway.com/variables)

## Audit review

The dashboard shows recent authenticated activity. The full authenticated feed is available at:

```text
GET /v1/audit-logs
```

Review unexpected logins, token revocations, exports, deletions, uploads, and MCP searches. Search text is represented by a hash in new audit records rather than stored verbatim.

## Deployment verification

After each production deployment:

```bash
curl --fail https://YOUR-MIMIR-SERVICE.up.railway.app/health
mimir logout
mimir login --cloud-url https://YOUR-MIMIR-SERVICE.up.railway.app
mimir upload --dry-run
mimir cloud-smoke --query "Mimir deployment verification"
```

Also open `/dashboard`, confirm the security-activity feed, export a small test account, and verify tenant isolation with two separate install identities before launch.
