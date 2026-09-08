import type { OpenAIChatModel, OpenAIEmbeddingModel } from '../ai/llm/openai.js';
import { loadEnv } from '../internal/load-env.js';

export interface ServerConfig {
  /**
   * The environment in which the application is running on.
   * @default 'development'
   */
  NODE_ENV: 'development' | 'production' | 'test';
  /**
   * The port to listen to.
   * @default 8001
   */
  PORT: number;
  /**
   * The connection string to Postgres.
   */
  POSTGRES_DSN: string;
  /**
   * The duration (in milliseconds) the server will wait before a hard shutdown.
   * @default 10_000
   */
  SERVER_SHUTDOWN_GRACE_PERIOD: number;
  /**
   * The API key for OpenAI API.
   */
  OPENAI_API_KEY: string;
  /**
   * The base URL to OpenAI API.
   */
  OPENAI_API_BASE_URL: string;
  /**
   * The chat model for OpenAI.
   */
  OPENAI_CHAT_MODEL: OpenAIChatModel;
  /**
   * The embedding model for OpenAI.
   */
  OPENAI_EMBEDDING_MODEL: OpenAIEmbeddingModel;
  /**
   * The tenant ID for Microsoft Graph API.
   * Only required by the 'retrieveEmails' tool.
   */
  MSGRAPH_API_TENANT_ID?: string;
  /**
   * The client ID for Microsoft Graph API.
   * Only required by the 'retrieveEmails' tool.
   */
  MSGRAPH_API_CLIENT_ID?: string;
  /**
   * The client secret for Microsoft Graph API.
   * Only required by the 'retrieveEmails' tool.
   */
  MSGRAPH_API_CLIENT_SECRET?: string;
}

export function loadServerConfig(): ServerConfig {
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

  const OPENAI_API_KEY = env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    throw new Error("'OPENAI_API_KEY' environment variable is required.");
  }
  const OPENAI_API_BASE_URL = env.OPENAI_API_BASE_URL;
  if (!OPENAI_API_BASE_URL) {
    throw new Error("'OPENAI_API_BASE_URL' environment variable is required.");
  }

  const OPENAI_CHAT_MODEL = env.OPENAI_CHAT_MODEL;
  if (!OPENAI_CHAT_MODEL) {
    throw new Error("'OPENAI_CHAT_MODEL' environment variable is required.");
  }

  const OPENAI_EMBEDDING_MODEL = env.OPENAI_EMBEDDING_MODEL;
  if (!OPENAI_EMBEDDING_MODEL) {
    throw new Error("'OPENAI_EMBEDDING_MODEL' environment variable is required.");
  }

  // Microsoft Graph credentials are optional, as they are only needed by the
  // 'retrieveEmails' tool. Coerce empty strings to `undefined` so that a blank
  // entry in '.env' is treated as 'not configured'.
  const MSGRAPH_API_TENANT_ID = env.MSGRAPH_API_TENANT_ID || undefined;
  const MSGRAPH_API_CLIENT_ID = env.MSGRAPH_API_CLIENT_ID || undefined;
  const MSGRAPH_API_CLIENT_SECRET = env.MSGRAPH_API_CLIENT_SECRET || undefined;

  return {
    NODE_ENV,
    PORT: Number(env.PORT) || 8001,
    POSTGRES_DSN,
    SERVER_SHUTDOWN_GRACE_PERIOD: Number(env.SERVER_SHUTDOWN_GRACE_PERIOD) || 10_000,

    OPENAI_API_KEY,
    OPENAI_API_BASE_URL,
    OPENAI_CHAT_MODEL,
    OPENAI_EMBEDDING_MODEL,

    MSGRAPH_API_TENANT_ID,
    MSGRAPH_API_CLIENT_ID,
    MSGRAPH_API_CLIENT_SECRET,
  };
}
