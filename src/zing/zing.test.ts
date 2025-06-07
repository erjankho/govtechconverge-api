import { beforeEach, describe, expect, test, vi } from 'vitest';

import { describeMatrix } from '../../test/zing/_setup.js';
import { HTTPStatusCode } from './http-status-code.js';
import type { HTTPMethod, MiddlewareHandler, RouteHandler } from './types.js';

describeMatrix('zing', (ctx) => {
  test('#get', async () => {
    const syncHandler = vi.fn<RouteHandler>((_, res) => {
      res.ok();
    });
    const asyncHandler = vi.fn<RouteHandler>(async (_, res) => {
      res.ok();
    });

    ctx.app.get('/', syncHandler);
    ctx.app.get('/a', asyncHandler);

    let res = await ctx.client.request('GET', '/');
    expect(res.status).toBe(HTTPStatusCode.OK);
    expect(syncHandler).toHaveBeenCalledOnce();

    res = await ctx.client.request('GET', '/a');
    expect(res.status).toBe(HTTPStatusCode.OK);
    expect(asyncHandler).toHaveBeenCalledOnce();
  });

  test('#head', async () => {
    const syncHandler = vi.fn<RouteHandler>((_, res) => {
      res.ok();
    });
    const asyncHandler = vi.fn<RouteHandler>(async (_, res) => {
      res.ok();
    });

    ctx.app.head('/', syncHandler);
    ctx.app.head('/a', asyncHandler);

    let res = await ctx.client.request('HEAD', '/');
    expect(res.status).toBe(HTTPStatusCode.OK);
    expect(syncHandler).toHaveBeenCalledOnce();

    res = await ctx.client.request('HEAD', '/a');
    expect(res.status).toBe(HTTPStatusCode.OK);
    expect(asyncHandler).toHaveBeenCalledOnce();
  });

  test('#patch', async () => {
    const syncHandler = vi.fn<RouteHandler>((_, res) => {
      res.ok();
    });
    const asyncHandler = vi.fn<RouteHandler>(async (_, res) => {
      res.ok();
    });

    ctx.app.patch('/', syncHandler);
    ctx.app.patch('/a', asyncHandler);

    let res = await ctx.client.request('PATCH', '/');
    expect(res.status).toBe(HTTPStatusCode.OK);
    expect(syncHandler).toHaveBeenCalledOnce();

    res = await ctx.client.request('PATCH', '/a');
    expect(res.status).toBe(HTTPStatusCode.OK);
    expect(asyncHandler).toHaveBeenCalledOnce();
  });

  test('#post', async () => {
    const syncHandler = vi.fn<RouteHandler>((_, res) => {
      res.ok();
    });
    const asyncHandler = vi.fn<RouteHandler>(async (_, res) => {
      res.ok();
    });

    ctx.app.post('/', syncHandler);
    ctx.app.post('/a', asyncHandler);

    let res = await ctx.client.request('POST', '/');
    expect(res.status).toBe(HTTPStatusCode.OK);
    expect(syncHandler).toHaveBeenCalledOnce();

    res = await ctx.client.request('POST', '/a');
    expect(res.status).toBe(HTTPStatusCode.OK);
    expect(asyncHandler).toHaveBeenCalledOnce();
  });

  test('#put', async () => {
    const syncHandler = vi.fn<RouteHandler>((_, res) => {
      res.ok();
    });
    const asyncHandler = vi.fn<RouteHandler>(async (_, res) => {
      res.ok();
    });

    ctx.app.put('/', syncHandler);
    ctx.app.put('/a', asyncHandler);

    let res = await ctx.client.request('PUT', '/');
    expect(res.status).toBe(HTTPStatusCode.OK);
    expect(syncHandler).toHaveBeenCalledOnce();

    res = await ctx.client.request('PUT', '/a');
    expect(res.status).toBe(HTTPStatusCode.OK);
    expect(asyncHandler).toHaveBeenCalledOnce();
  });

  test('#delete', async () => {
    const syncHandler = vi.fn<RouteHandler>((_, res) => {
      res.ok();
    });
    const asyncHandler = vi.fn<RouteHandler>(async (_, res) => {
      res.ok();
    });

    ctx.app.delete('/', syncHandler);
    ctx.app.delete('/a', asyncHandler);

    let res = await ctx.client.request('DELETE', '/');
    expect(res.status).toBe(HTTPStatusCode.OK);
    expect(syncHandler).toHaveBeenCalledOnce();

    res = await ctx.client.request('DELETE', '/a');
    expect(res.status).toBe(HTTPStatusCode.OK);
    expect(asyncHandler).toHaveBeenCalledOnce();
  });

  test('#options', async () => {
    const syncHandler = vi.fn<RouteHandler>((_, res) => {
      res.ok();
    });
    const asyncHandler = vi.fn<RouteHandler>(async (_, res) => {
      res.ok();
    });

    ctx.app.options('/', syncHandler);
    ctx.app.options('/a', asyncHandler);

    let res = await ctx.client.request('OPTIONS', '/');
    expect(res.status).toBe(HTTPStatusCode.OK);
    expect(syncHandler).toHaveBeenCalledOnce();

    res = await ctx.client.request('OPTIONS', '/a');
    expect(res.status).toBe(HTTPStatusCode.OK);
    expect(asyncHandler).toHaveBeenCalledOnce();
  });

  describe('#addRoute', () => {
    test.each<HTTPMethod>(['GET', 'HEAD', 'PATCH', 'POST', 'PUT', 'DELETE', 'OPTIONS'])(
      '%s',
      async (method) => {
        const syncHandler = vi.fn<RouteHandler>((_, res) => {
          res.ok();
        });
        const asyncHandler = vi.fn<RouteHandler>(async (_, res) => {
          res.ok();
        });

        ctx.app.addRoute(method, `/${method}`, syncHandler);
        ctx.app.addRoute(method, `/${method}/a`, asyncHandler);

        let res = await ctx.client.request(method, `/${method}`);
        expect(res.status).toBe(HTTPStatusCode.OK);
        expect(syncHandler).toHaveBeenCalledOnce();

        res = await ctx.client.request(method, `/${method}/a`);
        expect(res.status).toBe(HTTPStatusCode.OK);
        expect(asyncHandler).toHaveBeenCalledOnce();
      },
    );
  });

  test('#use', async () => {
    const callOrder: number[] = [];

    const middleware1 = vi.fn<MiddlewareHandler>(async (_req, _res, next) => {
      callOrder.push(1);
      await next();
      callOrder.push(5);
    });
    const middleware2 = vi.fn<MiddlewareHandler>(async (_req, _res, next) => {
      callOrder.push(2);
      await next();
      callOrder.push(4);
    });
    const routeHandler = vi.fn<RouteHandler>(async (_, res) => {
      callOrder.push(3);
      res.ok();
    });

    ctx.app.use(middleware1);
    ctx.app.use(middleware2);
    ctx.app.get('/', routeHandler);

    const res = await ctx.client.request('GET', `/`);
    expect(res.status).toBe(HTTPStatusCode.OK);
    expect(callOrder).toStrictEqual([1, 2, 3, 4, 5]);
    expect(middleware1).toHaveBeenCalledOnce();
    expect(middleware2).toHaveBeenCalledOnce();
    expect(routeHandler).toHaveBeenCalledOnce();
  });

  describe('404', () => {
    describe('default handler', () => {
      test.each<HTTPMethod>(['GET', 'PATCH', 'POST', 'PUT', 'DELETE', 'OPTIONS'])(
        '%s',
        async (method) => {
          const res = await ctx.client.request(method, '/');
          expect(res.status).toBe(HTTPStatusCode.NotFound);
          expect(await res.text()).toBe('{"message":"Not Found"}');
        },
      );

      test('HEAD', async () => {
        const res = await ctx.client.request('HEAD', '/');
        expect(res.status).toBe(HTTPStatusCode.NotFound);
        expect(await res.text()).toBe('');
      });
    });

    describe('custom handler', () => {
      beforeEach(() => {
        ctx.app.set404Handler(async (_, res) => {
          res.json(HTTPStatusCode.NotFound, { message: '404' });
        });
      });

      test.each<HTTPMethod>(['GET', 'PATCH', 'POST', 'PUT', 'DELETE', 'OPTIONS'])(
        '%s',
        async (method) => {
          const res = await ctx.client.request(method, '/');
          expect(res.status).toBe(HTTPStatusCode.NotFound);
          expect(await res.text()).toBe('{"message":"404"}');
        },
      );

      test('HEAD', async () => {
        const res = await ctx.client.request('HEAD', '/');
        expect(res.status).toBe(HTTPStatusCode.NotFound);
        expect(await res.text()).toBe('');
      });
    });
  });

  describe('error', () => {
    test('default handler', async () => {
      ctx.app.get('/', () => {
        throw new Error('Kaboom');
      });

      const res = await ctx.client.request('GET', '/');
      expect(res.status).toBe(HTTPStatusCode.InternalServerError);
      expect(await res.text()).toBe('{"message":"Internal Server Error"}');
    });

    test('custom handler', async () => {
      ctx.app.setErrorHandler((_err, _req, res) => {
        res.json(HTTPStatusCode.InternalServerError, { message: '500' });
      });

      ctx.app.get('/', () => {
        throw new Error('Kaboom');
      });

      const res = await ctx.client.request('GET', '/');
      expect(res.status).toBe(HTTPStatusCode.InternalServerError);
      expect(await res.text()).toBe('{"message":"500"}');
    });

    test('kaboom again in custom handler', async () => {
      ctx.app.get('/', () => {
        throw new Error('Kaboom');
      });

      ctx.app.setErrorHandler(() => {
        throw new Error('Kaboom again');
      });

      const res = await ctx.client.request('GET', '/');
      expect(res.status).toBe(HTTPStatusCode.InternalServerError);
      expect(await res.text()).toBe('{"message":"Internal Server Error"}');
    });
  });
});
