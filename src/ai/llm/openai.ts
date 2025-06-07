import { OpenAI as LLM } from 'openai';

const OPENAI_CHAT_MODELS = {
  'gpt-4o': {
    MAX_INPUT_TOKEN: 128000,
  },
} as const;

const OPENAI_EMBEDDING_MODELS = {
  'text-embedding-ada-002': {
    MAX_INPUT_TOKEN: 8191,
  },
} as const;

const OPENAPI_CHAT_COMPLETION_TOOLS: LLM.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'searchDocuments',
      description: 'Search relevant documents based on user query.',
    },
  },
  {
    type: 'function',
    function: {
      name: 'retrieveEmails',
      description: 'Retrieve emails based on extracted keywords from user query.',
      parameters: {
        type: 'object',
        properties: {
          keywords: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of keywords to search for.',
          },
          startDate: {
            type: 'string',
            description: `Start date for email search in UTC format (converted from GMT+8), expected format: YYYY-MM-DDT16:00:00Z.`,
          },
          endDate: {
            type: 'string',
            description:
              'End date for email search in UTC format (converted from GMT+8), expected format: YYYY-MM-DDT15:59:59Z.',
          },
        },
        required: ['keywords', 'startDate', 'endDate'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generateSpeech',
      description: 'Generate a speech based on user input',
    },
  },
];

export type OpenAIChatModel = keyof typeof OPENAI_CHAT_MODELS;
export type OpenAIEmbeddingModel = keyof typeof OPENAI_EMBEDDING_MODELS;

/**
 * Returns `true` if the given model is a valid and supported, else `false`.
 * @param model - The name of the model.
 */
export function isOpenAIChatModel(model: string): model is OpenAIChatModel {
  return Object.keys(OPENAI_CHAT_MODELS).includes(model);
}

/**
 * Returns `true` if the given model is a valid and supported, else `false`.
 * @param model - The name of the model.
 */
export function isOpenAIEmbeddingModel(model: string): model is OpenAIEmbeddingModel {
  return Object.keys(OPENAI_EMBEDDING_MODELS).includes(model);
}

export interface OpenAIChatSystemMessage {
  content: string;
  role: LLM.Chat.ChatCompletionSystemMessageParam['role'];
}

export interface OpenAIChatAssistantMessage {
  content: string;
  role: LLM.Chat.ChatCompletionAssistantMessageParam['role'];
  tool_calls?: LLM.Chat.ChatCompletionAssistantMessageParam['tool_calls'];
}

export interface OpenAIChatToolMessage {
  content: string;
  role: LLM.Chat.ChatCompletionToolMessageParam['role'];
  tool_call_id: LLM.Chat.ChatCompletionToolMessageParam['tool_call_id'];
}

export interface OpenAIChatUserMessage {
  content: string;
  role: LLM.Chat.ChatCompletionUserMessageParam['role'];
}

export type OpenAIChatCompletionMessageContent = string;
export interface OpenAIChatCompletionMessage {
  message: OpenAIChatCompletionMessageContent;
  toolCalls: LLM.Chat.ChatCompletionMessageToolCall[];
}

export interface OpenAIRetrieveEmailToolParams {
  keywords: string[];
  startDate: Date;
  endDate: Date;
}

export interface OpenAIOptions {
  apiKey: string;
  baseURL: string;
}

/**
 * A helper class that wraps the OpenAI client.
 */
class OpenAI {
  #llm: LLM;

  readonly chat: OpenAIChat;
  readonly embedding: OpenAIEmbedding;

  constructor({ apiKey, baseURL }: OpenAIOptions) {
    this.#llm = new LLM({ apiKey, baseURL });

    this.chat = new OpenAIChat(this.#llm);
    this.embedding = new OpenAIEmbedding(this.#llm);
  }
}

export default OpenAI;

interface OpenAIChatInvokeParams {
  systemPrompt: string;
  messages: (OpenAIChatUserMessage | OpenAIChatAssistantMessage | OpenAIChatToolMessage)[];
  model?: OpenAIChatModel;
}

class OpenAIChat {
  #llm: LLM;

  constructor(llm: LLM) {
    this.#llm = llm;
  }

  /**
   * Invokes a chat completion with OpenAI's model.
   * @param systemPrompt - The system prompt to set the context for the conversation.
   * @param messages - A list of messages, consisting of previous messages in the conversation.
   * @param model - The OpenAI chat completion model to use.
   */
  async invoke({
    systemPrompt,
    messages,
    model = 'gpt-4o',
  }: OpenAIChatInvokeParams): Promise<
    OpenAIChatCompletionMessage | OpenAIChatCompletionMessageContent
  > {
    const systemMessage: OpenAIChatSystemMessage = { role: 'system', content: systemPrompt };

    const res = await this.#llm.chat.completions.create({
      messages: [systemMessage, ...messages],
      model,
      temperature: 0,
      tools: OPENAPI_CHAT_COMPLETION_TOOLS,
      tool_choice: 'auto',
    });

    const toolCalls = res.choices[0].message.tool_calls ?? [];
    const message = res.choices[0].message.content ?? '';

    if (toolCalls.length === 0 && message.length === 0) {
      throw new Error('No message content found in the OpenAI response');
    }

    if (toolCalls.length === 0 && message.length > 0) {
      return message;
    }

    return { message, toolCalls };
  }
}

class OpenAIEmbedding {
  #llm: LLM;

  constructor(llm: LLM) {
    this.#llm = llm;
  }

  /**
   * Generates an embedding for the specified input text using the specified OpenAI embedding model.
   * @param input - The input text to generate the embedding for.
   * @param model - The OpenAI embedding model to use.
   */
  async invoke(input: string, model: OpenAIEmbeddingModel) {
    const res = await this.#llm.embeddings.create({
      input,
      model,
      encoding_format: 'float',
    });

    return res.data[0].embedding;
  }
}
