import { Server } from 'node:http';

import getPort from 'get-port';
import { afterAll, afterEach, beforeAll, beforeEach, describe } from 'vitest';

import type { HTTPMethod, JSONObject } from '../../src/zing/index.js';
import { Zing } from '../../src/zing/index.js';

/**
 * A helpful wrapper that sets up everything you need to test `zing`.
 * @param title - The title of the test suite.
 * @param fn - A test function.
 * @example
 * ```
 * describeMatrix('awesome title', (ctx) => {
 *    test('awesome test', async () => {
 *      // Use `ctx.app` to define routes.
 *      // Use `ctx.client` to make HTTP requests.
 *    });
 * });
 * ```
 */
export function describeMatrix(
  title: string,
  fn: (ctx: { app: Zing; client: Client }) => Promise<void> | void,
) {
  describe(title, async () => {
    let server: Server | null = null;
    let app: Zing | null = null;
    let client: Client | null = null;

    beforeAll(async () => {
      server = new Server((req, res) => {
        if (!app) {
          throw new Error('App has not been initialised.');
        }

        app.dispatch(req, res);
      });

      const port = await getPort();
      await new Promise<void>((resolve) => {
        if (!server) {
          throw new Error('Server has not been initialised.');
        }

        server.listen(port, 'localhost', resolve);
      });

      const baseURL = `http://localhost:${port}`;
      client = new Client(baseURL);
    });

    afterAll(async () => {
      await new Promise<void>((resolve, reject) => {
        if (!server) {
          throw new Error('Server has not been initialised.');
        }

        server.close((err) => (err ? reject(err) : resolve()));
      });

      client = null;
    });

    beforeEach(() => {
      app = new Zing();
    });

    afterEach(() => {
      app = null;
    });

    await fn({
      get app() {
        if (!app) {
          throw new Error('App has not been initialised.');
        }
        return app;
      },
      get client() {
        if (!client) {
          throw new Error('Client has not been initialised.');
        }
        return client;
      },
    });
  });
}

/**
 * A simple HTTP client to make requests to test our APIs.
 */
class Client {
  #baseURL: string;

  constructor(baseURL: string) {
    this.#baseURL = baseURL;
  }

  /**
   * Makes an HTTP request.
   * @param method - The HTTP method.
   * @param path - The URL path.
   * @param options - An optional body and/or headers.
   */
  request(
    method: HTTPMethod,
    path: string,
    options?: { body?: JSONObject | string; headers?: Headers },
  ) {
    return fetch(`${this.#baseURL}${path}`, {
      method,
      body: options?.body
        ? typeof options.body === 'object'
          ? JSON.stringify(options.body)
          : options.body
        : undefined,
      headers: options?.headers,
    });
  }
}
