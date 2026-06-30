const REDACTION_PATTERNS: Array<[RegExp, string]> = [
  [/\bsk-[A-Za-z0-9_-]{20,}\b/g, "[REDACTED_OPENAI_KEY]"],
  [/\bgh[pousr]_[A-Za-z0-9_]{20,}\b/g, "[REDACTED_GITHUB_TOKEN]"],
  [/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, "[REDACTED_EMAIL]"],
  [/\b(?:api[_-]?key|token|secret|password)\s*[:=]\s*["']?[^"'\s]{8,}/gi, "$1=[REDACTED_SECRET]"],
  [/-----BEGIN [A-Z ]+PRIVATE KEY-----[\s\S]*?-----END [A-Z ]+PRIVATE KEY-----/g, "[REDACTED_PRIVATE_KEY]"],
];

export function redactSecrets(input: string): string {
  return REDACTION_PATTERNS.reduce((text, [pattern, replacement]) => {
    return text.replace(pattern, replacement);
  }, input);
}
