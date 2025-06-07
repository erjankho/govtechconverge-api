import { beforeEach, describe, expect, it, test, vi } from 'vitest';

import OpenAI, { isOpenAIChatModel, isOpenAIEmbeddingModel } from './openai.js';

// Mock `gpt-tokenizer`.
const mockIsWithinTokenLimit = vi.fn();
vi.mock('gpt-tokenizer', () => ({
  isWithinTokenLimit: vi.fn(() => mockIsWithinTokenLimit()),
}));

// Mock `openai`.
const mockChatCompletionCreate = vi.fn();
const mockEmbeddingsCreate = vi.fn();
vi.mock('openai', () => ({
  OpenAI: vi.fn(() => ({
    chat: {
      completions: {
        create: mockChatCompletionCreate,
      },
    },
    embeddings: {
      create: mockEmbeddingsCreate,
    },
  })),
}));

describe('OpenAI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('model validation', () => {
    it('#isOpenAIChatModel', () => {
      expect(isOpenAIChatModel('gpt-4o')).toBe(true);
      expect(isOpenAIChatModel('invalid-model')).toBe(false);
    });

    it('#isOpenAIEmbeddingModel', () => {
      expect(isOpenAIEmbeddingModel('text-embedding-ada-002')).toBe(true);
      expect(isOpenAIEmbeddingModel('invalid-model')).toBe(false);
    });
  });

  describe('chat', () => {
    let openai: OpenAI;
    let tools: {
      type: string;
      function: {
        name: string;
        description: string;
        parameters?: {
          type: string;
          properties: Record<string, unknown>;
          required?: string[];
        };
      };
    }[];

    beforeEach(() => {
      openai = new OpenAI({
        apiKey: 'test-api-key',
        baseURL: 'https://test.openai.com',
      });
      tools = [
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
            description: 'Retrieve emails based on user query.',
            parameters: {
              type: 'object',
              properties: {
                keywords: {
                  type: 'array',
                  items: {
                    type: 'string',
                  },
                  description: 'List of keywords to search for.',
                },
                startDate: {
                  type: 'string',
                  description:
                    'Start date for email search in UTC format (converted from GMT+8), expected format: YYYY-MM-DDT16:00:00Z.',
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
    });

    test('invoke successfully', async () => {
      // Mock token count.
      mockIsWithinTokenLimit.mockReturnValue(true);

      const mockedResponse = {
        choices: [{ message: { content: 'Response' }, tool_calls: [] }],
      };

      mockChatCompletionCreate.mockResolvedValueOnce(mockedResponse);

      const result = await openai.chat.invoke({
        systemPrompt: 'System Prompt',
        messages: [{ role: 'user', content: 'User query' }],
      });

      expect(result).toEqual({
        message: 'Response',
        toolCalls: [],
      });
      expect(mockChatCompletionCreate).toHaveBeenCalledWith({
        messages: [
          { role: 'system', content: 'System Prompt' },
          { role: 'user', content: 'User Query' },
        ],
        model: 'gpt-4o',
        temperature: 0,
        tool_choice: 'auto',
        tools,
      });
    });

    test('truncate messages when token limit is exceeded', async () => {
      // Mock token count.
      // 1st call - system prompt and user query doesn't exceed
      // 2nd call - too long
      // 3rd call - too long
      // 4th call - acceptable
      mockIsWithinTokenLimit
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);

      const mockedResponse = {
        choices: [{ message: { content: 'Response' }, tool_calls: [] }],
      };

      mockChatCompletionCreate.mockResolvedValueOnce(mockedResponse);

      const result = await openai.chat.invoke({
        systemPrompt: 'System Prompt',
        messages: [
          { role: 'user', content: 'User message 1' },
          { role: 'assistant', content: 'Assistant message 1', tool_calls: [] },
          { role: 'user', content: 'User message 2' },
          { role: 'assistant', content: 'Assistant message 2', tool_calls: [] },
        ],
      });

      expect(result).toEqual({
        message: 'Response',
        toolCalls: [],
      });
      expect(mockChatCompletionCreate).toHaveBeenCalledWith({
        messages: [
          { role: 'system', content: 'System Prompt' },
          { role: 'user', content: 'User Query' },
        ],
        model: 'gpt-4o',
        temperature: 0,
        tool_choice: 'auto',
        tools,
      });
    });

    test('retain system prompt and user query if there is no history', async () => {
      // Mock token count.
      // 1st call - system prompt and user query doesn't exceed
      // 2nd call - acceptable
      mockIsWithinTokenLimit.mockReturnValueOnce(true).mockReturnValueOnce(true);

      const mockedResponse = {
        choices: [{ message: { content: 'Response' }, tool_calls: [] }],
      };

      mockChatCompletionCreate.mockResolvedValueOnce(mockedResponse);

      const result = await openai.chat.invoke({
        systemPrompt: 'System Prompt',
        messages: [{ role: 'user', content: 'User query' }],
      });

      expect(result).toEqual({
        message: 'Response',
        toolCalls: [],
      });
      expect(mockChatCompletionCreate).toHaveBeenCalledWith({
        messages: [
          { role: 'system', content: 'System Prompt' },
          { role: 'user', content: 'User Query' },
        ],
        model: 'gpt-4o',
        temperature: 0,
        tool_choice: 'auto',
        tools,
      });
    });

    test('throw when system prompt and user query exceeds token limit', async () => {
      // Mock token count.
      mockIsWithinTokenLimit.mockReturnValueOnce(false);

      await expect(
        openai.chat.invoke({
          systemPrompt: 'System Prompt',
          messages: [{ role: 'user', content: 'User query' }],
        }),
      ).rejects.toThrow('System prompt and user query exceeded the token limit');

      expect(mockChatCompletionCreate).not.toHaveBeenCalled();
    });
  });

  describe('embedding', () => {
    let openai: OpenAI;

    beforeEach(() => {
      openai = new OpenAI({
        apiKey: 'test-api-key',
        baseURL: 'https://test.openai.com',
      });
    });

    test('invoke successfully', async () => {
      const mockedResponse = {
        data: [{ embedding: [0.1, 0.2, 0.3] }],
      };

      mockEmbeddingsCreate.mockResolvedValueOnce(mockedResponse);

      const result = await openai.embedding.invoke('Hello world!', 'text-embedding-ada-002');

      expect(result).toStrictEqual([0.1, 0.2, 0.3]);
      expect(mockEmbeddingsCreate).toHaveBeenCalledWith({
        input: 'Hello world!',
        model: 'text-embedding-ada-002',
        encoding_format: 'float',
      });
    });
  });
});
