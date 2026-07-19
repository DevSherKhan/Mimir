# Security Policy

## Supported versions

Security fixes are applied to the latest release and the default branch.

## Reporting a vulnerability

Do not open a public issue for suspected vulnerabilities, exposed credentials, authentication bypasses, tenant-isolation failures, or unsafe ingestion behavior.

Use [GitHub's private vulnerability reporting flow](https://github.com/DevSherKhan/Mimir/security/advisories/new). Include affected versions, reproduction steps, impact, and any suggested mitigation. Remove real chat content, access tokens, database URLs, and API keys from the report.

You should receive an acknowledgement within 72 hours. The maintainer will coordinate validation, remediation, release timing, and disclosure. Please allow a reasonable remediation window before public disclosure.

## Security boundaries

- Local transcript access occurs only in the local agent.
- Uploaded content must be sanitized before leaving the user's machine.
- Cloud records and searches are scoped to the authenticated user.
- Production deployments require HTTPS and PostgreSQL backups.
- Development access tokens are disabled in production unless explicitly enabled.
