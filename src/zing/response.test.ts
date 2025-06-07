import { describe, expect, test } from 'vitest';

import { describeMatrix } from '../../test/zing/_setup.js';
import { HTTPStatusCode } from './http-status-code.js';

describeMatrix('response', (ctx) => {
  describe('#header', () => {
    test('sets the header', async () => {
      ctx.app.get('/', (_, res) => {
        res.header('x-hello', 'world');
        res.ok();
      });

      const res = await ctx.client.request('GET', '/');
      expect(res.status).toBe(HTTPStatusCode.OK);
      expect(res.headers.get('x-hello')).toBe('world');
    });

    test('overwrites with the latest value for the same key', async () => {
      ctx.app.get('/', (_, res) => {
        res.header('x-hello', 'world');
        res.header('x-hello', 'world!');
        res.ok();
      });

      const res = await ctx.client.request('GET', '/');
      expect(res.status).toBe(HTTPStatusCode.OK);
      expect(res.headers.get('x-hello')).toBe('world!');
    });
  });

  test('#json', async () => {
    ctx.app.get('/', (_, res) => {
      res.json(HTTPStatusCode.OK, {
        hello: 'world',
        foo: 123,
        bar: false,
        quz: new Date('2024-10-31'),
      });
    });

    const res = await ctx.client.request('GET', '/');
    expect(res.status).toBe(HTTPStatusCode.OK);
    expect(res.headers.get('content-type')).toBe('application/json; charset=utf-8');
    expect(res.headers.get('content-length')).toBe('72');
    expect(await res.text()).toBe(
      '{"hello":"world","foo":123,"bar":false,"quz":"2024-10-31T00:00:00.000Z"}',
    );
  });

  test('#text', async () => {
    ctx.app.get('/', (_, res) => {
      res.text(HTTPStatusCode.OK, 'hello world');
    });

    const res = await ctx.client.request('GET', '/');
    expect(res.status).toBe(HTTPStatusCode.OK);
    expect(res.headers.get('content-type')).toBe('text/plain; charset=utf-8');
    expect(res.headers.get('content-length')).toBe('11');
    expect(await res.text()).toBe('hello world');
  });

  test('#ok', async () => {
    ctx.app.get('/', (_, res) => {
      res.ok();
    });

    const res = await ctx.client.request('GET', '/');
    expect(res.status).toBe(HTTPStatusCode.OK);
    expect(await res.text()).toBe('');
  });

  test('#created', async () => {
    ctx.app.get('/', (_, res) => {
      res.created();
    });

    const res = await ctx.client.request('GET', '/');
    expect(res.status).toBe(HTTPStatusCode.Created);
    expect(await res.text()).toBe('');
  });

  test('#noContent', async () => {
    ctx.app.get('/', (_, res) => {
      res.noContent();
    });

    const res = await ctx.client.request('GET', '/');
    expect(res.status).toBe(HTTPStatusCode.NoContent);
    expect(await res.text()).toBe('');
  });
});
