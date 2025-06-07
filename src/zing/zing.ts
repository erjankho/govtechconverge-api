import { type IncomingMessage, type ServerResponse } from 'node:http';

import { addRoute, createRouter, findRoute, type RouterContext } from 'rou3';

import { Context } from './context.js';
import { PayloadTooLargeError, UnsupportedContentTypeError } from './errors.js';
import { HTTPStatusCode } from './http-status-code.js';
import type {
  ErrorHandler,
  HTTPMethod,
  MiddlewareHandler,
  NextFunction,
  RouteData,
  RouteHandler,
} from './types.js';

const DEFAULT_404_HANDLER: RouteHandler = (_, res) => {
  res.json(HTTPStatusCode.NotFound, { message: 'Not Found' });
};

const DEFAULT_ERROR_HANDLER: ErrorHandler = (err, _req, res) => {
  if (err instanceof PayloadTooLargeError) {
    res.json(err.code, { message: 'Payload Too Large' });
    return;
  }
  if (err instanceof UnsupportedContentTypeError) {
    res.json(err.code, { message: 'Unsupported Media Type' });
    return;
  }

  res.json(HTTPStatusCode.InternalServerError, { message: 'Internal Server Error' });
};

/**
 * A lightweight HTTP framework.
 */
export class Zing {
  #router: RouterContext<RouteData>;
  #fn404Handler: RouteHandler;
  #fnErrorHandler: ErrorHandler;

  #middlewares: MiddlewareHandler[] = [];

  constructor() {
    this.#router = createRouter();
    this.#fn404Handler = DEFAULT_404_HANDLER;
    this.#fnErrorHandler = DEFAULT_ERROR_HANDLER;

    this.dispatch = this.dispatch.bind(this);
  }

  /**
   * Adds a handler for `GET` request on the specified route.
   * @param route - The route for the `GET` request.
   * @param handler - The handler for the `GET` request.
   */
  get(route: string, handler: RouteHandler) {
    this.addRoute('GET', route, handler);
  }

  /**
   * Adds a handler for `HEAD` request on the specified route.
   * @param route - The route for the `HEAD` request.
   * @param handler - The handler for the `HEAD` request.
   */
  head(route: string, handler: RouteHandler) {
    this.addRoute('HEAD', route, handler);
  }

  /**
   * Adds a handler for `PATCH` request on the specified route.
   * @param route - The route for the `PATCH` route.
   * @param handler - The handler for the `PATCH` request.
   */
  patch(route: string, handler: RouteHandler) {
    this.addRoute('PATCH', route, handler);
  }

  /**
   * Adds a handler for `POST` request on the specified route.
   * @param route - The route for the `POST` route.
   * @param handler - The handler the `POST` request.
   */
  post(route: string, handler: RouteHandler) {
    this.addRoute('POST', route, handler);
  }

  /**
   * Adds a handler for `PUT` request on the specified route.
   * @param route - The route for the `PUT` route.
   * @param handler - The handler for the `PUT` request.
   */
  put(route: string, handler: RouteHandler) {
    this.addRoute('PUT', route, handler);
  }

  /**
   * Adds a handler for `DELETE` request on the specified route.
   * @param route - The route for the `DELETE` route.
   * @param handler - The handler for the `DELETE` request.
   */
  delete(route: string, handler: RouteHandler) {
    this.addRoute('DELETE', route, handler);
  }

  /**
   * Adds a handler for `OPTIONS` request on the specified route.
   * @param route - The route for the `OPTIONS` route.
   * @param handler - The handler for the `OPTIONS` request.
   */
  options(route: string, handler: RouteHandler) {
    this.addRoute('OPTIONS', route, handler);
  }

  /**
   * Adds a handler for the specified HTTP method and route.
   * @param method - The HTTP method.
   * @param route - The route for the request.
   * @param handler - The handler for the request.
   */
  addRoute(method: HTTPMethod, route: string, handler: RouteHandler) {
    addRoute(this.#router, method, route, {
      method,
      route,
      handler,
    });
  }

  /**
   * Adds a middleware handler to the middleware chain.
   * Middleware is executed in the order it is added.
   * @param handler - The middleware handler for the requests and responses.
   */
  use(handler: MiddlewareHandler) {
    this.#middlewares.push(handler);
  }

  /**
   * Sets a custom handler for requests that do not match any registered routes.
   * @param handler - The function that will handle unmatched requests.
   */
  set404Handler(handler: RouteHandler) {
    this.#fn404Handler = handler;
  }

  /**
   * Sets a custom handler for handling errors.
   * @param handler - The function that will handle errors.
   */
  setErrorHandler(handler: ErrorHandler) {
    this.#fnErrorHandler = handler;
  }

  /**
   * Processes incoming HTTP requests and dispatches them to the appropriate handlers.
   */
  async dispatch(req: IncomingMessage, res: ServerResponse) {
    await this.#dispatch(new Context(req, res));
  }

  async #dispatch(ctx: Context) {
    const { req, res } = ctx;

    const match = findRoute(this.#router, req.method, req.pathname);
    ctx.setParams(match?.params);

    try {
      await this.#middlewares.reduceRight<NextFunction>(
        (next, middleware) => async () => {
          await middleware(req, res, next);
        },
        async () => {
          if (!match) {
            await this.#fn404Handler(req, res);
            return;
          }

          await match.data.handler(req, res);
        },
      )();
    } catch (err) {
      try {
        await this.#fnErrorHandler(err, req, res);
      } catch (err) {
        DEFAULT_ERROR_HANDLER(err, req, res);
      }
    }
  }
}
