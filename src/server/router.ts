import { z } from 'zod';

import type {
  OpenAIChatAssistantMessage,
  OpenAIChatToolMessage,
  OpenAIChatUserMessage,
  OpenAIRetrieveEmailToolParams,
} from '../ai/llm/openai.js';
import OpenAI from '../ai/llm/openai.js';
import RecursiveCharacterTextSplitter from '../ai/text-splitter/recursive-character-text-splitter.js';
import type { ServerConfig } from '../config/server-config.js';
import type { DB } from '../db/index.js';
import { sql } from '../db/index.js';
import { isNonNullConstraint, isUniqueViolation } from '../db/pg-error.js';
import type {
  AssistantMessageMetadata,
  EmailEmbeddingNew,
  ToolMessageMetadata,
} from '../db/types.js';
import type { Logger } from '../internal/logger.js';
import MSGraphClient from '../msgraph/client.js';
import type { RouteHandler } from '../zing/index.js';
import { HTTPStatusCode, Zing } from '../zing/index.js';
import requestLogMiddleware from './middleware/request-log-middleware.js';

const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });

export interface CreateRouterOptions {
  config: ServerConfig;
  db: DB;
  logger: Logger;
}

export function createRouter({ config, db, logger }: CreateRouterOptions) {
  const router = new Zing();

  // Setup middlewares.
  router.use(requestLogMiddleware({ logger }));

  router.get('/', (_, res) => {
    res.text(HTTPStatusCode.OK, 'OK');
  });

  const deps: Deps = {
    config,
    db,
    logger,
    llm: new OpenAI({
      apiKey: config.OPENAI_API_KEY,
      baseURL: config.OPENAI_API_BASE_URL,
    }),
    msGraph: createMSGraphClientFactory(config),
  };

  router.post('/users', routeCreateUser(deps));
  router.post('/conversations', routeCreateConversation(deps));
  router.post('/messages', routeCreateMessage(deps));

  return router;
}

interface Deps {
  config: ServerConfig;
  db: DB;
  logger: Logger;
  llm: OpenAI;
  /**
   * Resolves the Microsoft Graph client, constructing it on first use.
   * @throws {Error} if Microsoft Graph is not configured.
   */
  msGraph: () => MSGraphClient;
}

/**
 * Returns a factory that lazily constructs the Microsoft Graph client, so that
 * the server can start without Microsoft Graph credentials. The client is only
 * needed by the 'retrieveEmails' tool, and `ClientSecretCredential` rejects
 * empty credentials at construction time.
 * @param config - The server configuration.
 */
function createMSGraphClientFactory(config: ServerConfig): () => MSGraphClient {
  let client: MSGraphClient | null = null;

  return () => {
    if (client) {
      return client;
    }

    const {
      MSGRAPH_API_TENANT_ID: tenantId,
      MSGRAPH_API_CLIENT_ID: clientId,
      MSGRAPH_API_CLIENT_SECRET: clientSecret,
    } = config;

    if (!tenantId || !clientId || !clientSecret) {
      throw new Error(
        "Microsoft Graph is not configured. Set 'MSGRAPH_API_TENANT_ID', 'MSGRAPH_API_CLIENT_ID' and 'MSGRAPH_API_CLIENT_SECRET' to enable email retrieval.",
      );
    }

    client = new MSGraphClient({ tenantId, clientId, clientSecret });

    return client;
  };
}

function routeCreateUser({ db }: Deps): RouteHandler {
  const CREATE_USER_REQUEST = z.object({
    email: z.string().email(),
  });

  return async (req, res) => {
    const body = await req.json();
    const { error, data } = CREATE_USER_REQUEST.safeParse(body);

    if (error) {
      res.json(HTTPStatusCode.UnprocessableEntity, { message: 'Unprocessable Entity' });
      return;
    }

    try {
      const result = await db
        .insertInto('new_users')
        .values({ email: data.email.toLowerCase() })
        .returning(['id', 'email', 'created_at as createdAt', 'updated_at as updatedAt'])
        .executeTakeFirstOrThrow();

      res.json(HTTPStatusCode.Created, result);
    } catch (err) {
      if (isUniqueViolation(err)) {
        res.json(HTTPStatusCode.Conflict, { message: 'User already exists.' });
        return;
      }

      throw err;
    }
  };
}

function routeCreateConversation({ db }: Deps): RouteHandler {
  const CREATE_CONVERSATION_REQUEST = z.object({
    email: z.string().email(),
  });

  return async (req, res) => {
    const body = await req.json();
    const { error, data } = CREATE_CONVERSATION_REQUEST.safeParse(body);

    if (error) {
      res.json(HTTPStatusCode.UnprocessableEntity, { message: 'Unprocessable Entity' });
      return;
    }

    try {
      const result = await db
        .insertInto('conversations')
        .values(({ selectFrom }) => ({
          new_user_id: selectFrom('new_users')
            .select('id')
            .where('email', '=', data.email.toLowerCase()),
          title: 'Untitled',
        }))
        .returning([
          'id',
          'new_user_id as newUserId',
          'title',
          'created_at as createdAt',
          'updated_at as updatedAt',
        ])
        .executeTakeFirstOrThrow();

      res.json(HTTPStatusCode.Created, result);
    } catch (err) {
      if (isNonNullConstraint(err)) {
        res.json(HTTPStatusCode.NotFound, { message: 'Not Found' });
        return;
      }

      throw err;
    }
  };
}

function routeCreateMessage({ config, db, llm, msGraph }: Deps): RouteHandler {
  const CREATE_MESSAGE_REQUEST = z.object({
    conversationId: z.string().uuid(),
    content: z.string().min(1),
  });

  return async (req, res) => {
    const body = await req.json();
    const { error, data } = CREATE_MESSAGE_REQUEST.safeParse(body);

    if (error) {
      res.json(HTTPStatusCode.UnprocessableEntity, { message: 'Unprocessable Entity' });
      return;
    }

    const user = await db
      .selectFrom('conversations')
      .innerJoin('new_users', 'new_users.id', 'conversations.new_user_id')
      .select(['new_users.id', 'new_users.email as email'])
      .where('conversations.id', '=', data.conversationId)
      .executeTakeFirst();

    if (!user) {
      res.json(HTTPStatusCode.NotFound, { message: 'Not Found' });
      return;
    }

    const messages = await db
      .selectFrom((eb) =>
        eb
          .selectFrom('messages')
          .select(['author', 'content', 'metadata', 'order'])
          .where('conversation_id', '=', data.conversationId)
          .orderBy('order', 'desc')
          .limit(20)
          .as('subquery'),
      )
      .selectAll()
      .orderBy('order', 'asc')
      .execute();
    let lastMessageOrder = messages.at(-1)?.order ?? 0;

    const history = messages.map<
      OpenAIChatUserMessage | OpenAIChatAssistantMessage | OpenAIChatToolMessage
    >(({ author, content, metadata }) => {
      switch (author) {
        case 'USER':
          return {
            role: 'user',
            content,
          };
        case 'ASSISTANT': {
          const { tools } = metadata as AssistantMessageMetadata;
          return {
            role: 'assistant',
            content,
            ...(tools.length > 0 && {
              tool_calls: tools.map(({ id, name, args }) => ({
                id,
                type: 'function',
                function: {
                  name,
                  arguments: args,
                },
              })),
            }),
          };
        }
        case 'TOOL':
          return {
            role: 'tool',
            content,
            tool_call_id: (metadata as ToolMessageMetadata).tool_id,
          };
        default:
          throw new Error(`Unknown message author: ${author}`);
      }
    });

    const today = new Date();
    const userQuery: OpenAIChatUserMessage = { role: 'user', content: data.content };

    let response = await llm.chat.invoke({
      systemPrompt: `You are a **productivity assistant** with three key capabilities:
      1) Retrieving emails
      2) Searching documents
      3) Writing speeches

      **Guidelines:**
      1) **Reference Date:** Always use the current date: ${today.toLocaleDateString()}.
      2) **Capability Scope:** If a request is outside your capabilities, politely inform the user of your available functions.
      3) **Information Requests:** If you lack necessary details, ask the user for clarification.
      4) **Unclear Requests:** Politely seek clarification if a request is ambiguous.
      5) **Context Awareness:** If a request is a follow-up to a previous one, incorporate both the past context and the new request to provide a coherent response.
      6) **Keyword Extraction:**
        - Extract multi-word phrases as a single keyword when applicable.
        - Maintain the original wording and case-insensitive matching.
        - Do not remove important words due to stopword filtering.
        - Verify the extracted keywords before executing a function.
      7) **Date Interpretation:**
        - If the user specifies only a month and year (e.g., "March 2025"), automatically interpret it as March 1, 2025 - March 31, 2025.
        - If the user provides an exact date range, use it as given.
        - If no date is provided, ask the user for clarification
      8) **Function Execution:** Ensure all required information is provided before triggering any functions.

      If a request does not meet these guidelines, **do not attempt to answer**. 
      Instead, politely inform the user of the missing information.`,
      messages: [...history, userQuery],
      model: config.OPENAI_CHAT_MODEL,
    });

    if (typeof response === 'string') {
      await db
        .insertInto('messages')
        .values([
          {
            author: 'USER',
            content: data.content,
            conversation_id: data.conversationId,
            order: ++lastMessageOrder,
            metadata: null,
          },
          {
            author: 'ASSISTANT',
            content: response,
            conversation_id: data.conversationId,
            order: ++lastMessageOrder,
            metadata: {
              tools: [],
            },
          },
        ])
        .executeTakeFirstOrThrow();

      return res.json(HTTPStatusCode.Created, { message: response });
    }

    const toolCalls = response.toolCalls;
    const newMessages: (
      | OpenAIChatUserMessage
      | OpenAIChatAssistantMessage
      | OpenAIChatToolMessage
    )[] = [];

    newMessages.push(userQuery, {
      role: 'assistant',
      content: response.message,
      tool_calls: toolCalls,
    });

    for (const tool of toolCalls) {
      if (tool.function.name === 'searchDocuments') {
        const embedding = await llm.embedding.invoke(data.content, config.OPENAI_EMBEDDING_MODEL);
        const result = await db
          .selectFrom('embeddings')
          .innerJoin('files', 'embeddings.file_id', 'files.id')
          .innerJoin('files_new_users', 'files.id', 'files_new_users.file_id')
          .select([
            'embeddings.text',
            sql<string>`files.name`.as('fileName'),
            sql<number>`embedding <=> ${`[${embedding}]`}`.as('distance'),
          ])
          .where('files_new_users.new_user_id', '=', user.id)
          .orderBy('distance')
          .limit(2)
          .execute();

        newMessages.push({
          role: 'tool',
          content: result
            .map(({ fileName, text }) => `source: ${fileName}\n\n${text}`)
            .join('\n\n'),
          tool_call_id: tool.id,
        });

        response = await llm.chat.invoke({
          systemPrompt: `You are a productivity assistant with the following capabilities:

          Searching documents/files and answering questions.
          - You can respond with answers only when a relevant question is asked,
          and only when you have access to the specific documents or files.
          - If the question is not relevant, or you do not have such access,
          you must not tell users the given format, you must not provide any answers,
          and you must only respond with your capabilities.
          - Else, make sure to be accurate and not too concise,
          use prose and bullets where appropriate,
          and format your response in the order of 3 sections with bold headers:
          1) Fact(s)
          2) Chunk(s) used to answer the question (include the page/section/FAQ headers or even the page numbers if any)
          3) Source(s) - for this section, make sure to cite the file name`,
          messages: [...history, ...newMessages],
          model: config.OPENAI_CHAT_MODEL,
        });
      }

      if (tool.function.name === 'retrieveEmails') {
        const { keywords, startDate, endDate }: OpenAIRetrieveEmailToolParams = JSON.parse(
          tool.function.arguments,
        );

        for (const keyword of keywords) {
          for await (const messages of msGraph().getMessagesByEmail(
            user.email,
            keyword,
            new Date(startDate),
            new Date(endDate),
          )) {
            for (const message of messages.value) {
              const header = message.internetMessageHeaders.find(
                ({ name }) => name === 'msip_labels',
              );

              if (!header || !isSensitivityLabelSupported(header.value)) {
                continue;
              }

              if (message.body.contentType === 'text' && message.body.content) {
                const chunks = splitter.split(message.body.content);
                const embeddings = await Promise.all<EmailEmbeddingNew>(
                  chunks.map(async (chunk) => ({
                    conversation_id: data.conversationId,
                    embedding: JSON.stringify(
                      await llm.embedding.invoke(chunk, config.OPENAI_EMBEDDING_MODEL),
                    ),
                    expires_on: new Date(Date.now() + 24 * 60 * 60 * 1000),
                    text: chunk,
                    metadata: {
                      id: message.id,
                      subject: message.subject,
                      received_at: message.receivedDateTime,
                    },
                  })),
                );

                await sql`
                  INSERT INTO email_embeddings (conversation_id, text, metadata, embedding, expires_on)
                  VALUES ${sql.join(
                    embeddings.map(
                      (embedding) => sql`(
                        ${embedding.conversation_id},
                        ${embedding.text},
                        ${embedding.metadata},
                        ${embedding.embedding},
                        ${embedding.expires_on}
                      )`,
                    ),
                  )}
                  ON CONFLICT (conversation_id, (metadata->>'id'))
                  DO NOTHING;`.execute(db);
              }
            }
          }
        }

        const embedding = await llm.embedding.invoke(data.content, config.OPENAI_EMBEDDING_MODEL);
        const result = await db
          .selectFrom('email_embeddings')
          .select([
            'email_embeddings.metadata',
            'email_embeddings.text',
            sql<number>`embedding <=> ${`[${embedding}]`}`.as('distance'),
          ])
          .where('conversation_id', '=', data.conversationId)
          .where('expires_on', '>', today)
          .where(sql`embedding <=> ${`[${embedding}]`}`, '<', 0.5)
          .orderBy('distance')
          .limit(5)
          .execute();

        newMessages.push({
          role: 'tool',
          content: result
            .map(
              ({ text, metadata }) =>
                `Subject: ${metadata.subject}\n Received datetime: ${metadata.received_at}\n Content: ${text}\n`,
            )
            .join('\n\n'),
          tool_call_id: tool.id,
        });

        response = await llm.chat.invoke({
          systemPrompt: `
          Generate a clear, concise and natural-sounding summary of the provided email(s) in fluent English.

          **Requirements:**
          - The summary should be **brief, easy to understand and factual**.
          - Maintain a **professional and neutral tone**.
          - Adapt the structure based on the number of emails.
          - Ensure the response directly addresses the user's request: ${data.content}

          The structure should be **flexible** to ensure readability while keeping the summary precise and professional.
          
          DO NOT RESPOND WITH AN EMPTY SUMMARY. Respond that no emails are found if there are no emails to summarize.`,
          messages: [...history, ...newMessages],
          model: config.OPENAI_CHAT_MODEL,
        });
      }

      if (tool.function.name === 'generateSpeech') {
        response = await llm.chat.invoke({
          systemPrompt: `You are a assistant able to write speech with the following capabilities:

          Referencing speechwriting guidelines to write speeches.
          - You must reference the relevant speechwriting guide(s). If there are none, respond with: Please upload speechwriting guidelines.
          - Format your response in the order of 4 sections with bold headers:
          1) Summary - for this section, include a concise summary of who the speech is written for and what the speech is about
          2) Speech - for this section, make sure to group similar points into paragraphs, and keep each paragraph as a numbered point
          3) Chunk(s) used to write the speech - for this section, include references from speechwriting guidelines, speech preferences, and the page/section/FAQ headers of any relevant documents
          4) Source(s) - for this section, include the speechwriting guide and the document where you got the speech content from, and make sure to cite the file name(s)`,
          messages: [...history, ...newMessages],
          model: config.OPENAI_CHAT_MODEL,
        });
      }

      if (typeof response === 'string') {
        newMessages.push({
          role: 'assistant',
          content: response,
          tool_calls: [],
        });
      } else {
        throw new Error('Nested tool calls are not supported yet.');
      }
    }

    await db
      .insertInto('messages')
      .values(
        newMessages.map((message) => {
          switch (message.role) {
            case 'user':
              return {
                author: 'USER',
                content: message.content,
                conversation_id: data.conversationId,
                order: ++lastMessageOrder,
                metadata: null,
              };
            case 'assistant':
              return {
                author: 'ASSISTANT',
                content: message.content,
                conversation_id: data.conversationId,
                order: ++lastMessageOrder,
                metadata: {
                  tools:
                    message.tool_calls?.map((tool) => ({
                      id: tool.id,
                      name: tool.function.name,
                      args: tool.function.arguments,
                    })) ?? [],
                },
              };
            case 'tool':
              return {
                author: 'TOOL',
                content: message.content,
                conversation_id: data.conversationId,
                order: ++lastMessageOrder,
                metadata: {
                  tool_id: message.tool_call_id,
                },
              };
          }
        }),
      )
      .executeTakeFirstOrThrow();

    res.json(HTTPStatusCode.Created, { message: newMessages[newMessages.length - 1].content });
  };
}

const SUPPORTED_SENSITIVITY_LABELS = {
  '5434c4c7-833e-41e4-b0ab-cdb227a2f6f7': 'OFFICIAL (OPEN)',
  '4aaa7e78-45b1-4890-b8a3-003d1d728a3e': 'OFFICIAL (CLOSED) / NON-SENSITIVE',
  '770f46e1-5fba-47ae-991f-a0785d9c0dac': 'OFFICIAL (CLOSED) / SENSITIVE NORMAL',
  'a8737adb-0c79-46a2-8440-0996bc024fec': 'OFFICIAL (CLOSED) / SENSITIVE HIGH',
  '54803508-8490-4252-b331-d9b72689e942': 'RESTRICTED / NON-SENSITIVE',
  '153db910-0838-4c35-bb3a-1ee21aa199ac': 'RESTRICTED / SENSITIVE NORMAL',
};

function isSensitivityLabelSupported(label: string) {
  return Object.keys(SUPPORTED_SENSITIVITY_LABELS).some((key) => label.includes(key));
}
