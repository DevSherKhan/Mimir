import { buildServer } from "./app.js";
import { getServerRuntimeConfig } from "./config.js";

const { port, host } = getServerRuntimeConfig();

const server = await buildServer(port);
await server.listen({ port, host });

let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  server.log.info({ signal }, "Shutting down Mimir");
  try {
    await server.close();
  } catch (error) {
    server.log.error(error, "Mimir shutdown failed");
    process.exitCode = 1;
  }
}

process.once("SIGTERM", () => {
  void shutdown("SIGTERM");
});
process.once("SIGINT", () => {
  void shutdown("SIGINT");
});
