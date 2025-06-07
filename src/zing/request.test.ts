import { afterEach, describe, expect, test } from 'vitest';

import { describeMatrix } from '../../test/zing/_setup.js';
import { HTTPStatusCode } from './http-status-code.js';
import type { HTTPMethod } from './types.js';

describeMatrix('request', (ctx) => {
  test('#url', async () => {
    let actualURL: unknown;

    ctx.app.get('/url', (req, res) => {
      actualURL = req.url;
      res.ok();
    });

    await ctx.client.request('GET', '/url?qs=123');
    expect(actualURL).toBe('/url?qs=123');
  });

  test('#pathname', async () => {
    let actualPathname: unknown;

    ctx.app.get('/pathname', (req, res) => {
      actualPathname = req.pathname;
      res.ok();
    });

    await ctx.client.request('GET', '/pathname?qs=123');
    expect(actualPathname).toBe('/pathname');
  });

  test('#querystring', async () => {
    let actualQuerystring: unknown;

    ctx.app.get('/querystring', (req, res) => {
      actualQuerystring = req.querystring;
      res.ok();
    });

    await ctx.client.request('GET', '/querystring?qs=123&qs=456&foo=bar');
    expect(actualQuerystring).toBe('?qs=123&qs=456&foo=bar');
  });

  describe('#query', () => {
    let actualQuery: unknown;

    afterEach(() => {
      actualQuery = undefined;
    });

    describe('when key exists', () => {
      test('retrieves without default value', async () => {
        ctx.app.get('/query', (req, res) => {
          actualQuery = req.query('qs');
          res.ok();
        });

        await ctx.client.request('GET', '/query?qs=123');
        expect(actualQuery).toBe('123');
      });

      test('retrieves with default value', async () => {
        ctx.app.get('/query', (req, res) => {
          actualQuery = req.query('qs', '456');
          res.ok();
        });

        await ctx.client.request('GET', '/query?qs=123');
        expect(actualQuery).toBe('123');
      });
    });

    describe('when key does not exists', () => {
      test('retrieves without default value', async () => {
        ctx.app.get('/query', (req, res) => {
          actualQuery = req.query('qs');
          res.ok();
        });

        await ctx.client.request('GET', '/query');
        expect(actualQuery).toBeUndefined();
      });

      test('retrieves with default value', async () => {
        ctx.app.get('/query', (req, res) => {
          actualQuery = req.query('qs', '456');
          res.ok();
        });

        await ctx.client.request('GET', '/query');
        expect(actualQuery).toBe('456');
      });
    });

    test('retrieves the first value of duplicate keys', async () => {
      ctx.app.get('/query', (req, res) => {
        actualQuery = req.query('qs');
        res.ok();
      });

      await ctx.client.request('GET', '/query?qs=123&qs=456');
      expect(actualQuery).toBe('123');
    });
  });

  describe('#queries', () => {
    let actualQueries: unknown;

    afterEach(() => {
      actualQueries = undefined;
    });

    describe('when key exists', () => {
      test('retrieves without default value', async () => {
        ctx.app.get('/queries', (req, res) => {
          actualQueries = req.queries('qs');
          res.ok();
        });

        await ctx.client.request('GET', '/queries?qs=123&qs=456');
        expect(actualQueries).toStrictEqual(['123', '456']);
      });

      test('retrieves with default value', async () => {
        ctx.app.get('/queries', (req, res) => {
          actualQueries = req.queries('qs', ['789']);
          res.ok();
        });

        await ctx.client.request('GET', '/queries?qs=123&qs=456');
        expect(actualQueries).toStrictEqual(['123', '456']);
      });
    });

    describe('when key does not exists', () => {
      test('retrieves without default value', async () => {
        ctx.app.get('/queries', (req, res) => {
          actualQueries = req.queries('qs');
          res.ok();
        });

        await ctx.client.request('GET', '/queries');
        expect(actualQueries).toBeUndefined();
      });

      test('retrieves with default value', async () => {
        ctx.app.get('/queries', (req, res) => {
          actualQueries = req.queries('qs', ['789']);
          res.ok();
        });

        await ctx.client.request('GET', '/queries');
        expect(actualQueries).toStrictEqual(['789']);
      });
    });
  });

  describe('#method', () => {
    test.each<HTTPMethod>(['GET', 'HEAD', 'PATCH', 'POST', 'PUT', 'DELETE', 'OPTIONS'])(
      '%s',
      async (method) => {
        let actualMethod: unknown;

        ctx.app.addRoute(method, `/${method}`, (req, res) => {
          actualMethod = req.method;
          res.ok();
        });

        await ctx.client.request(method, `/${method}`);
        expect(actualMethod).toBe(method);
      },
    );
  });

  describe('#params', () => {
    test('no params', async () => {
      let actualParams: unknown;

      ctx.app.get(`/noparams`, (req, res) => {
        actualParams = req.params;
        res.ok();
      });

      await ctx.client.request('GET', '/noparams');
      expect(actualParams).toEqual({});
    });

    test('named route', async () => {
      let actualParams: unknown;

      ctx.app.get(`/t/:tid/m/:mid`, (req, res) => {
        actualParams = req.params;
        res.ok();
      });

      await ctx.client.request(
        'GET',
        '/t/0192a98a-ebbd-762f-ac5f-c9ea95ad1b5c/m/0192a98f-9a40-73ab-9a81-030217e5d307',
      );
      expect(actualParams).toEqual({
        tid: '0192a98a-ebbd-762f-ac5f-c9ea95ad1b5c',
        mid: '0192a98f-9a40-73ab-9a81-030217e5d307',
      });
    });

    test('wildcard', async () => {
      let actualParams: unknown;

      ctx.app.get(`/wildcard/**`, (req, res) => {
        actualParams = req.params;
        res.ok();
      });

      await ctx.client.request('GET', '/wildcard/some/random/path');
      expect(actualParams).toEqual({ _: 'some/random/path' });
    });

    test('named wildcard', async () => {
      let actualParams: unknown;

      ctx.app.get(`/wildcard/**:name`, (req, res) => {
        actualParams = req.params;
        res.ok();
      });

      await ctx.client.request('GET', '/wildcard/some/random/path');
      expect(actualParams).toEqual({ name: 'some/random/path' });
    });
  });

  describe('#header', () => {
    let actualHeaderValue: unknown;

    afterEach(() => {
      actualHeaderValue = undefined;
    });

    describe('when key exists', () => {
      test('retrieves without default value', async () => {
        ctx.app.get('/', (req, res) => {
          actualHeaderValue = req.header('X-Test');
          res.ok();
        });

        await ctx.client.request('GET', '/', { headers: new Headers({ 'X-Test': '123' }) });
        expect(actualHeaderValue).toBe('123');
      });

      test('retrieves with default value', async () => {
        ctx.app.get('/', (req, res) => {
          actualHeaderValue = req.header('X-Test', '456');
          res.ok();
        });

        await ctx.client.request('GET', '/', { headers: new Headers({ 'X-Test': '123' }) });
        expect(actualHeaderValue).toBe('123');
      });
    });

    describe('when key does not exists', () => {
      test('retrieves without default value', async () => {
        ctx.app.get('/', (req, res) => {
          actualHeaderValue = req.header('X-Test');
          res.ok();
        });

        await ctx.client.request('GET', '/');
        expect(actualHeaderValue).toBeUndefined();
      });

      test('retrieves with default value', async () => {
        ctx.app.get('/', (req, res) => {
          actualHeaderValue = req.header('X-Test', '456');
          res.ok();
        });

        await ctx.client.request('GET', '/');
        expect(actualHeaderValue).toBe('456');
      });
    });

    test('when key is `set-cookie`', async () => {
      ctx.app.get('/', (req, res) => {
        actualHeaderValue = req.header('set-cookie');
        res.ok();
      });

      const headers = new Headers();
      headers.append('set-cookie', 'abc=123');
      headers.append('set-cookie', 'def=456');

      await ctx.client.request('GET', '/', { headers });
      expect(actualHeaderValue).toBe('abc=123, def=456');
    });
  });

  describe('#body', async () => {
    let actualBody: unknown;

    afterEach(() => {
      actualBody = undefined;
    });

    // Unable to test HTTP methods `GET` and `HEAD` as they cannot include a body.

    test.each<HTTPMethod>(['PATCH', 'POST', 'PUT'])('when HTTP method is %s', async (method) => {
      ctx.app.addRoute(method, '/', async (req, res) => {
        actualBody = await req.body();
        res.ok();
      });

      await ctx.client.request(method, '/', { body: 'hello world' });
      expect(actualBody).toBeInstanceOf(Buffer);
      expect(actualBody).toStrictEqual(Buffer.from('hello world'));
    });

    test.each<HTTPMethod>(['DELETE', 'OPTIONS'])('when HTTP method is %s', async (method) => {
      ctx.app.addRoute(method, '/', async (req, res) => {
        actualBody = await req.body();
        res.ok();
      });

      await ctx.client.request(method, '/', { body: 'hello world' });
      expect(actualBody).toBeNull();
    });

    test('when payload is too large', async () => {
      ctx.app.post('/', async (req, res) => {
        actualBody = await req.body();
        res.ok();
      });

      const res = await ctx.client.request('POST', '/', { body: 'a' + 'a'.repeat(1024 * 1024) });
      expect(res.status).toBe(HTTPStatusCode.PayloadTooLarge);
      expect(await res.text()).toBe('{"message":"Payload Too Large"}');
    });
  });

  describe('#text', () => {
    let actualText: unknown;

    afterEach(() => {
      actualText = undefined;
    });

    // Unable to test HTTP methods `GET` and `HEAD` as they cannot include a body.

    test.each<HTTPMethod>(['PATCH', 'POST', 'PUT'])('when HTTP method is %s', async (method) => {
      ctx.app.addRoute(method, '/', async (req, res) => {
        actualText = await req.text();
        res.ok();
      });

      await ctx.client.request(method, '/', {
        body: 'hello world',
        headers: new Headers({ 'content-type': 'text/plain; charset=utf-8' }),
      });
      expect(typeof actualText).toBe('string');
      expect(actualText).toBe('hello world');
    });

    test.each<HTTPMethod>(['DELETE', 'OPTIONS'])('when HTTP method is %s', async (method) => {
      ctx.app.addRoute(method, '/', async (req, res) => {
        actualText = await req.text();
        res.ok();
      });

      await ctx.client.request(method, '/', {
        body: 'hello world',
        headers: new Headers({ 'content-type': 'text/plain; charset=utf-8' }),
      });
      expect(actualText).toBeNull();
    });

    test('when `content-type` header is missing', async () => {
      ctx.app.post('/', async (req, res) => {
        actualText = await req.text();
        res.ok();
      });

      const res = await ctx.client.request('POST', '/', { body: 'hello world' });
      expect(res.status).toBe(HTTPStatusCode.UnsupportedMediaType);
      expect(await res.text()).toBe('{"message":"Unsupported Media Type"}');
      expect(actualText).toBeUndefined();
    });

    test('when `content-type` header is invalid', async () => {
      ctx.app.post('/', async (req, res) => {
        actualText = await req.text();
        res.ok();
      });

      const res = await ctx.client.request('POST', '/', {
        body: 'hello world',
        headers: new Headers({ 'content-type': 'application/json; charset=utf-8' }),
      });
      expect(res.status).toBe(HTTPStatusCode.UnsupportedMediaType);
      expect(await res.text()).toBe('{"message":"Unsupported Media Type"}');
      expect(actualText).toBeUndefined();
    });

    test('when payload is too large', async () => {
      ctx.app.post('/', async (req, res) => {
        actualText = await req.text();
        res.ok();
      });

      const res = await ctx.client.request('POST', '/', {
        body: 'a' + 'a'.repeat(1024 * 1024),
        headers: new Headers({ 'content-type': 'text/plain; charset=utf-8' }),
      });
      expect(res.status).toBe(HTTPStatusCode.PayloadTooLarge);
      expect(await res.text()).toBe('{"message":"Payload Too Large"}');
      expect(actualText).toBeUndefined();
    });
  });

  describe('#json', () => {
    let actualJSON: unknown;

    afterEach(() => {
      actualJSON = undefined;
    });

    // Unable to test HTTP methods `GET` and `HEAD` as they cannot include a body.

    test.each<HTTPMethod>(['PATCH', 'POST', 'PUT'])('when HTTP method is %s', async (method) => {
      ctx.app.addRoute(method, '/', async (req, res) => {
        actualJSON = await req.json();
        res.ok();
      });

      await ctx.client.request(method, '/', {
        body: { hello: 'world' },
        headers: new Headers({ 'content-type': 'application/json; charset=utf-8' }),
      });
      expect(typeof actualJSON).toBe('object');
      expect(actualJSON).toStrictEqual({ hello: 'world' });
    });

    test.each<HTTPMethod>(['DELETE', 'OPTIONS'])('when HTTP method is %s', async (method) => {
      ctx.app.addRoute(method, '/', async (req, res) => {
        actualJSON = await req.json();
        res.ok();
      });

      await ctx.client.request(method, '/', {
        body: { hello: 'world' },
        headers: new Headers({ 'content-type': 'application/json; charset=utf-8' }),
      });
      expect(actualJSON).toBeNull();
    });

    test('when `content-type` header is missing', async () => {
      ctx.app.post('/', async (req, res) => {
        actualJSON = await req.json();
        res.ok();
      });

      const res = await ctx.client.request('POST', '/', { body: { hello: 'world' } });
      expect(res.status).toBe(HTTPStatusCode.UnsupportedMediaType);
      expect(await res.text()).toBe('{"message":"Unsupported Media Type"}');
      expect(actualJSON).toBeUndefined();
    });

    test('when `content-type` header is invalid', async () => {
      ctx.app.post('/', async (req, res) => {
        actualJSON = await req.json();
        res.ok();
      });

      const res = await ctx.client.request('POST', '/', {
        body: { hello: 'world' },
        headers: new Headers({ 'content-type': 'text/plain; charset=utf-8' }),
      });
      expect(res.status).toBe(HTTPStatusCode.UnsupportedMediaType);
      expect(await res.text()).toBe('{"message":"Unsupported Media Type"}');
      expect(actualJSON).toBeUndefined();
    });

    test('when payload is too large', async () => {
      ctx.app.post('/', async (req, res) => {
        actualJSON = await req.json();
        res.ok();
      });

      const res = await ctx.client.request('POST', '/', {
        body: { a: 'a' + 'a'.repeat(1024 * 1024) },
        headers: new Headers({ 'content-type': 'application/json; charset=utf-8' }),
      });
      expect(res.status).toBe(HTTPStatusCode.PayloadTooLarge);
      expect(await res.text()).toBe('{"message":"Payload Too Large"}');
    });
  });
});
