import { loadEnv } from '../internal/load-env.js';

export interface DBConfig {
  /**
   * The environment in which the application is running on.
   * @default 'development'
   */
  NODE_ENV: 'development' | 'production' | 'test';
  /**
   * The connection string to Postgres.
   * @default 'postgres://root:secret@localhost:5432/converge-development'
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

  return {
    NODE_ENV,

    POSTGRES_DSN: env.POSTGRES_DSN || 'postgres://root:secret@localhost:5432/converge-development',
  };
}
