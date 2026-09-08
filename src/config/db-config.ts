import { loadEnv } from '../internal/load-env.js';

export interface DBConfig {
  /**
   * The environment in which the application is running on.
   * @default 'development'
   */
  NODE_ENV: 'development' | 'production' | 'test';
  /**
   * The connection string to Postgres.
   */
  POSTGRES_DSN: string;
}

export function loadDBConfig(): DBConfig {
  const env = loadEnv();

  const NODE_ENV = env.NODE_ENV || 'development';
  if (NODE_ENV !== 'development' && NODE_ENV !== 'production' && NODE_ENV !== 'test') {
    throw new Error(
      "'NODE_ENV' environment variable must be either 'development', 'production' or 'test'.",
    );
  }

  const POSTGRES_DSN = env.POSTGRES_DSN;
  if (!POSTGRES_DSN) {
    throw new Error("'POSTGRES_DSN' environment variable is required.");
  }

  return {
    NODE_ENV,

    POSTGRES_DSN,
  };
}
