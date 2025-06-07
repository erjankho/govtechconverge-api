import type { OpenAIChatModel, OpenAIEmbeddingModel } from '../ai/llm/openai.js';
import { isOpenAIChatModel, isOpenAIEmbeddingModel } from '../ai/llm/openai.js';
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
   * @default 'postgres://root:secret@localhost:5432/converge-development'
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
   * @default 'gpt-4o'
   */
  OPENAI_CHAT_MODEL: OpenAIChatModel;
  /**
   * The embedding model for OpenAI.
   * @default 'text-embedding-ada-002'
   */
  OPENAI_EMBEDDING_MODEL: OpenAIEmbeddingModel;
  /**
   * The tenant ID for Microsoft Graph API.
   */
  MSGRAPH_API_TENANT_ID: string;
  /**
   * The client ID for Microsoft Graph API.
   */
  MSGRAPH_API_CLIENT_ID: string;
  /**
   * The client secret for Microsoft Graph API.
   */
  MSGRAPH_API_CLIENT_SECRET: string;
}

export function loadServerConfig(): ServerConfig {
  const env = loadEnv();

  const NODE_ENV = env.NODE_ENV || 'development';
  if (NODE_ENV !== 'development' && NODE_ENV !== 'production' && NODE_ENV !== 'test') {
    throw new Error(
      "'NODE_ENV' environment variable must be either 'development', 'production' or 'test'.",
    );
  }

  const OPENAI_API_KEY = env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    throw new Error("'OPENAI_API_KEY' environment variable is required.");
  }
  const OPENAI_API_BASE_URL = env.OPENAI_API_BASE_URL;
  if (!OPENAI_API_BASE_URL) {
    throw new Error("'OPENAI_API_BASE_URL' environment variable is required.");
  }

  const OPENAI_CHAT_MODEL = env.OPENAI_CHAT_MODEL || 'gpt-4o';
  if (!isOpenAIChatModel(OPENAI_CHAT_MODEL)) {
    throw new Error(
      `'OPENAI_CHAT_MODEL' environment variable contains invalid or unsupported chat model: ${OPENAI_CHAT_MODEL}`,
    );
  }
  const OPENAI_EMBEDDING_MODEL = env.OPENAI_EMBEDDING_MODEL || 'text-embedding-ada-002';
  if (!isOpenAIEmbeddingModel(OPENAI_EMBEDDING_MODEL)) {
    throw new Error(
      `'OPENAI_EMBEDDING_MODEL' environment variable contains invalid or unsupported embedding model: ${OPENAI_EMBEDDING_MODEL}`,
    );
  }

  const MSGRAPH_API_TENANT_ID = env.MSGRAPH_API_TENANT_ID;
  if (!MSGRAPH_API_TENANT_ID) {
    throw new Error("'MSGRAPH_API_TENANT_ID' environment variable is required.");
  }

  const MSGRAPH_API_CLIENT_ID = env.MSGRAPH_API_CLIENT_ID;
  if (!MSGRAPH_API_CLIENT_ID) {
    throw new Error("'MSGRAPH_API_CLIENT_ID' environment variable is required.");
  }

  const MSGRAPH_API_CLIENT_SECRET = env.MSGRAPH_API_CLIENT_SECRET;
  if (!MSGRAPH_API_CLIENT_SECRET) {
    throw new Error("'MSGRAPH_API_CLIENT_SECRET' environment variable is required.");
  }

  return {
    NODE_ENV,
    PORT: Number(env.PORT) || 8001,
    POSTGRES_DSN: env.POSTGRES_DSN || 'postgres://root:secret@localhost:5432/converge-development',
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
