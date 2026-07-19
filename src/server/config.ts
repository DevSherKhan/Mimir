export interface ServerRuntimeConfig {
  port: number;
  host: string;
}

export function getServerRuntimeConfig(env: NodeJS.ProcessEnv = process.env): ServerRuntimeConfig {
  const rawPort = env.PORT?.trim() || "3000";
  if (!/^\d+$/u.test(rawPort)) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }
  const port = Number.parseInt(rawPort, 10);
  if (port < 1 || port > 65_535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }

  const host = env.HOST?.trim() || "0.0.0.0";
  if (/\s/u.test(host)) {
    throw new Error("HOST must not contain whitespace");
  }

  return { port, host };
}
