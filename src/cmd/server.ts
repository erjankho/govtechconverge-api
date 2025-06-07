import type { ServerConfig } from '../config/server-config.js';
import { loadServerConfig } from '../config/server-config.js';
import { createDatabase } from '../db/index.js';
import type { Logger } from '../internal/logger.js';
import { createLogger } from '../internal/logger.js';
import { createRouter, Server } from '../server/index.js';

export default async function serverAction() {
  const config = loadServerConfig();
  const logger = createLogger({ env: config.NODE_ENV });

  try {
    await runAction(config, logger);
  } catch (err) {
    logger.error(err);
  }
}

async function runAction(config: ServerConfig, logger: Logger) {
  logger.info(`Environment: ${config.NODE_ENV.toUpperCase()}`);

  const db = await createDatabase({ connectionString: config.POSTGRES_DSN });
  const router = createRouter({ config, db, logger });

  const server = new Server(router.dispatch, {
    shutdownGracePeriod: config.SERVER_SHUTDOWN_GRACE_PERIOD,
  });

  server.onerror = (err) => {
    logger.error(err, 'Something went wrong!');
    process.exit(1);
  };

  server.listen(config.PORT).then(() => {
    logger.info(`Listening to port ${config.PORT}...`);
  });

  // Handles signal from process managers.
  process.once('SIGTERM', async () => {
    logger.info('Gracefully shutting down from SIGTERM...');

    await server.shutdown();
    await db.destroy();

    logger.info('Shutdown OK!');
  });

  // Due to the following issue, we cannot use `process.once` for `SIGINT` signal.
  // https://github.com/pnpm/pnpm/issues/7374#issuecomment-1858609366
  // Therefore, the current workaround is to use `process.on`
  // with a flag to make sure only one shutdown event is triggered.

  // Handles `CTRL-C` signal.
  let isShuttingDown = false;
  process.on('SIGINT', async () => {
    if (isShuttingDown) {
      return;
    }
    isShuttingDown = true;

    // Add a blank line before additional logs as `CTRL+C` will output `^C` onto the terminal.
    console.log();
    logger.info('Gracefully shutting down from SIGINT (CTRL+C)...');

    await server.shutdown();
    await db.destroy();

    logger.info('Shutdown OK!');
  });
}
