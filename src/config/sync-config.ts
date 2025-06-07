import type { OpenAIEmbeddingModel } from '../ai/llm/openai.js';
import { isOpenAIEmbeddingModel } from '../ai/llm/openai.js';
import { loadEnv } from '../internal/load-env.js';

export interface SyncConfig {
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
  /**
   * The endpoint to Azure Document Intelligence.
   */
  AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT: string;
  /**
   * The API key for Azure Document Intelligence API.
   */
  AZURE_DOCUMENT_INTELLIGENCE_API_KEY: string;
  /**
   * The API key for OpenAI API.
   */
  OPENAI_API_KEY: string;
  /**
   * The base URL to OpenAI API.
   */
  OPENAI_API_BASE_URL: string;
  /**
   * The embedding model for OpenAI.
   * @default 'text-embedding-ada-002'
   */
  OPENAI_EMBEDDING_MODEL: OpenAIEmbeddingModel;
}

export function loadSyncConfig(): SyncConfig {
  const env = loadEnv();

  const NODE_ENV = env.NODE_ENV || 'development';
  if (NODE_ENV !== 'development' && NODE_ENV !== 'production' && NODE_ENV !== 'test') {
    throw new Error(
      "'NODE_ENV' environment variable must be either 'development', 'production' or 'test'.",
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

  const AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT = env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
  if (!AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT) {
    throw new Error("'AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT' environment variable is required.");
  }

  const AZURE_DOCUMENT_INTELLIGENCE_API_KEY = env.AZURE_DOCUMENT_INTELLIGENCE_API_KEY;
  if (!AZURE_DOCUMENT_INTELLIGENCE_API_KEY) {
    throw new Error("'AZURE_DOCUMENT_INTELLIGENCE_API_KEY' environment variable is required.");
  }

  const OPENAI_API_KEY = env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    throw new Error("'OPENAI_API_KEY' environment variable is required.");
  }
  const OPENAI_API_BASE_URL = env.OPENAI_API_BASE_URL;
  if (!OPENAI_API_BASE_URL) {
    throw new Error("'OPENAI_API_BASE_URL' environment variable is required.");
  }

  const OPENAI_EMBEDDING_MODEL = env.OPENAI_EMBEDDING_MODEL || 'text-embedding-ada-002';
  if (!isOpenAIEmbeddingModel(OPENAI_EMBEDDING_MODEL)) {
    throw new Error(
      `'OPENAI_EMBEDDING_MODEL' environment variable contains invalid or unsupported embedding model: ${OPENAI_EMBEDDING_MODEL}`,
    );
  }

  return {
    NODE_ENV,
    POSTGRES_DSN: env.POSTGRES_DSN || 'postgres://root:secret@localhost:5432/converge-development',

    MSGRAPH_API_TENANT_ID,
    MSGRAPH_API_CLIENT_ID,
    MSGRAPH_API_CLIENT_SECRET,

    AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT,
    AZURE_DOCUMENT_INTELLIGENCE_API_KEY,

    OPENAI_API_KEY,
    OPENAI_API_BASE_URL,
    OPENAI_EMBEDDING_MODEL,
  };
}
