import { loadConfig } from "./config.js";
import { logger, setLogLevel } from "./logger.js";
import { startServer } from "./server.js";

const log = logger("main");

function main(): void {
  let cfg;
  try {
    cfg = loadConfig();
  } catch (err) {
    log.error((err as Error).message);
    process.exit(1);
    return;
  }
  setLogLevel(cfg.logLevel);

  const server = startServer(cfg);

  const shutdown = (signal: string) => {
    log.info(`received ${signal}, shutting down`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 3000).unref();
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("unhandledRejection", (reason) => log.error("unhandledRejection", reason));
}

main();
