import { v4 as uuidv4 } from 'uuid';

import type { Logger } from '../../internal/logger.js';
import type { MiddlewareHandler } from '../../zing/index.js';

export interface RequestLogOptions {
  logger: Logger;
}

/**
 * A middleware that:
 * - logs incoming requests
 * - sets request ID header onto the response
 * - tracks the time taken to process the request
 */
export default ({ logger }: RequestLogOptions): MiddlewareHandler => {
  return async (req, res, next) => {
    const startTime = process.hrtime.bigint();
    const reqId = uuidv4();

    logger.info(
      {
        reqId,
        url: req.url,
        method: req.method,
      },
      'Incoming request',
    );

    try {
      res.header('x-converge-request-id', reqId);

      await next();
    } catch (err) {
      logger.error({ reqId, err }, 'Request error');

      throw err;
    } finally {
      const endTime = process.hrtime.bigint();

      logger.info(
        {
          reqId,
          timeTaken: Number(endTime - startTime) / 1_000_000,
        },
        'Request completed',
      );
    }
  };
};
