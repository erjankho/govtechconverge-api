import { describe, expect, test } from 'vitest';

import RecursiveCharacterTextSplitter from './recursive-character-text-splitter.js';

describe('RecursiveCharacterTextSplitter', () => {
  describe('without overlap', () => {
    const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 10, chunkOverlap: 0 });

    describe('paragraphs', () => {
      test('\\n\\n', () => {
        const output = splitter.split('Paragraph1\n\nParagraph2\n\nParagraph3');

        expect(output).toStrictEqual(['Paragraph1', 'Paragraph2', 'Paragraph3']);
      });

      test('template literal', () => {
        const output = splitter.split(`
          Paragraph1

          Paragraph2

          Paragraph3
        `);

        expect(output).toStrictEqual(['Paragraph1', 'Paragraph2', 'Paragraph3']);
      });
    });

    describe('newlines', () => {
      test('\\n', () => {
        const output = splitter.split('Newline1\nNewline2\nNewline3');

        expect(output).toStrictEqual(['Newline1', 'Newline2', 'Newline3']);
      });

      test('template literal', () => {
        const output = splitter.split(`
          Newline1
          Newline2
          Newline3
        `);

        expect(output).toStrictEqual(['Newline1', 'Newline2', 'Newline3']);
      });
    });

    test('words', () => {
      const output = splitter.split('Hi. I am John Doe. How are you?');

      expect(output).toStrictEqual(['Hi. I am', 'John Doe.', 'How are', 'you?']);
    });

    test('oversize word', () => {
      const output = splitter.split('extraordinary');

      expect(output).toStrictEqual(['extraordin', 'ary']);
    });

    test('mixture of paragraphs, newlines, words and oversize words ', () => {
      const output = splitter.split(`
        Hi. I am John Doe. How are you?

        Hello, I am good! How about you?

        I'm doing well, thank you for asking.

        That's great to hear!
        What brings you here today?

        I was just curious about what you're working on lately.

        Oh, I have been focusing on a extraordinary project.
        It's quite exciting. What about you?
      `);

      expect(output).toStrictEqual([
        'Hi. I am',
        'John Doe.',
        'How are',
        'you?',
        'Hello, I',
        'am good!',
        'How about',
        'you?',
        "I'm doing",
        'well,',
        'thank you',
        'for',
        'asking.',
        "That's",
        'great to',
        'hear!',
        'What',
        'brings you',
        'here',
        'today?',
        'I was just',
        'curious',
        'about what',
        "you're",
        'working on',
        'lately.',
        'Oh, I have',
        'been',
        'focusing',
        'on a',
        'extraordin',
        'ary',
        'project.',
        "It's quite",
        'exciting.',
        'What about',
        'you?',
      ]);
    });
  });

  describe('with overlap', () => {
    const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 10, chunkOverlap: 5 });

    describe('paragraphs', () => {
      test('\\n\\n', () => {
        const output = splitter.split('Paragraph1\n\nParagraph2\n\nParagraph3');

        expect(output).toStrictEqual(['Paragraph1', 'Paragraph2', 'Paragraph3']);
      });

      test('template literal', () => {
        const output = splitter.split(`
          Paragraph1

          Paragraph2

          Paragraph3
        `);

        expect(output).toStrictEqual(['Paragraph1', 'Paragraph2', 'Paragraph3']);
      });
    });

    describe('newlines', () => {
      test('\\n', () => {
        const output = splitter.split('Newline1\nNewline2\nNewline3');

        expect(output).toStrictEqual(['Newline1', 'Newline2', 'Newline3']);
      });

      test('template literal', () => {
        const output = splitter.split(`
          Newline1
          Newline2
          Newline3
        `);

        expect(output).toStrictEqual(['Newline1', 'Newline2', 'Newline3']);
      });
    });

    test('words', () => {
      const output = splitter.split('Hi. I am John Doe. How are you?');

      expect(output).toStrictEqual([
        'Hi. I am',
        'I am John',
        'John Doe.',
        'Doe. How',
        'How are',
        'are you?',
      ]);
    });

    test('oversize word', () => {
      const output = splitter.split('extraordinary');

      expect(output).toStrictEqual(['extraordin', 'ordinary']);
    });

    test('mixture of paragraphs, newlines, words and oversize words ', () => {
      const output = splitter.split(`
        Hi. I am John Doe. How are you?

        Hello, I am good! How about you?

        I'm doing well, thank you for asking.

        That's great to hear!
        What brings you here today?

        I was just curious about what you're working on lately.

        Oh, I have been focusing on a extraordinary project.
        It's quite exciting. What about you?
      `);

      expect(output).toStrictEqual([
        'Hi. I am',
        'I am John',
        'John Doe.',
        'Doe. How',
        'How are',
        'are you?',
        'Hello, I',
        'I am good!',
        'good! How',
        'How about',
        'about you?',
        "I'm doing",
        'well,',
        'thank you',
        'you for',
        'asking.',
        "That's",
        'great to',
        'to hear!',
        'What',
        'brings you',
        'you here',
        'today?',
        'I was just',
        'curious',
        'about what',
        "you're",
        'working on',
        'on lately.',
        'Oh, I have',
        'have been',
        'focusing',
        'on a',
        'extraordin',
        'ordinary',
        'project.',
        "It's quite",
        'exciting.',
        'What about',
        'about you?',
      ]);
    });
  });
});
