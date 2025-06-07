import type { LoggerOptions } from 'pino';
import { pino } from 'pino';

export type { Logger } from 'pino';

export interface CreateLoggerOptions {
  env: 'development' | 'production' | 'test';
}

export function createLogger({ env }: CreateLoggerOptions) {
  const options: LoggerOptions = {
    base: null,
    level: 'info',
  };

  if (env === 'development') {
    options.level = 'debug';
    options.transport = {
      target: 'pino-pretty',
      options: {
        translateTime: 'SYS:standard',
      },
    };
  }

  return pino(options);
}
