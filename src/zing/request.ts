import type { IncomingMessage } from 'node:http';

import { safeDestr } from 'destr';

import type { Context } from './context.js';
import { PayloadTooLargeError, UnsupportedContentTypeError } from './errors.js';
import type { HTTPMethod } from './types.js';

const ALLOWED_HTTP_METHODS: HTTPMethod[] = ['PATCH', 'POST', 'PUT'];
const BODY_LIMIT = 1024 * 1024;

const SUPPORTED_TEXT_CONTENT_TYPE = ['text/plain', 'text/plain; charset=utf-8'];
const SUPPORTED_JSON_CONTENT_TYPE = ['application/json', 'application/json; charset=utf-8'];

/**
 * A helper class to manage HTTP request.
 */
export class Request {
  #ctx: Context;
  #cachedBody: Buffer | null = null;
  #url: URL;

  readonly node: IncomingMessage;

  constructor(req: IncomingMessage, ctx: Context) {
    this.node = req;
    this.#ctx = ctx;

    this.#url = new URL(req.url!, `http://${req.headers.host}`);
  }

  /**
   * Returns the full URL of the request.
   */
  get url() {
    return this.pathname + this.querystring;
  }

  /**
   * Returns the path of the request.
   */
  get pathname() {
    return this.#url.pathname;
  }

  /**
   * Returns the querystring of the request.
   */
  get querystring() {
    return this.#url.search;
  }

  /**
   * Returns the value of a specific query from the request.
   * @param key - The name of the query (case-insensitive).
   * @param defaultValue - An optional default value to return if the query is not found.
   */
  query(key: string, defaultValue?: string) {
    key = key.toLowerCase();
    const value = this.#url.searchParams.get(key);

    if (!value) {
      return defaultValue;
    }
    return value;
  }

  /**
   * Returns the value of a specific queries from the request.
   * @param key - The name of the queries (case-insensitive).
   * @param defaultValue - An optional default value to return if the query is not found.
   */
  queries(key: string, defaultValue?: string[]) {
    key = key.toLowerCase();
    const value = this.#url.searchParams.getAll(key);

    if (value.length === 0) {
      return defaultValue;
    }
    return value;
  }

  /**
   * Returns the HTTP method of the request.
   */
  get method() {
    return this.node.method as HTTPMethod;
  }

  /**
   * Returns the route parameters.
   */
  get params() {
    return this.#ctx.params;
  }

  /**
   * Returns the value of a specific header from the request.
   * @param key - The name of the header (case-insensitive).
   * @param defaultValue - An optional default value to return if the header is not found.
   */
  header(key: string, defaultValue?: string) {
    key = key.toLowerCase();
    const value = this.node.headers[key];

    if (!value) {
      return defaultValue;
    }
    // Only `set-cookie` header will always be an array.
    // https://nodejs.org/api/http.html#messageheaders
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    return value;
  }

  /**
   * Returns a buffer containing the request body.
   *
   * Only HTTP methods `PATCH`, `POST`, `PUT` are allowed to have a body.
   * If the HTTP method is not one of these, it returns `null`.
   *
   * @throws {PayloadTooLargeError} When the request body exceeds the allowed size limit.
   */
  async body() {
    if (!ALLOWED_HTTP_METHODS.includes(this.method)) {
      return null;
    }

    if (this.#cachedBody) {
      return this.#cachedBody;
    }

    let received = 0;
    const chunks: Buffer[] = [];

    for await (const chunk of this.node as AsyncIterable<Buffer>) {
      received += chunk.length;
      if (received > BODY_LIMIT) {
        throw new PayloadTooLargeError();
      }

      chunks.push(chunk);
    }

    this.#cachedBody = Buffer.concat(chunks);
    return this.#cachedBody;
  }

  /**
   * Returns the request body as a string.
   *
   * Only HTTP methods `PATCH`, `POST`, `PUT` are allowed to have a body.
   * If the HTTP method is not one of these, it returns `null`.
   *
   * @param encoding - The encoding to use for converting the body to a string.
   *
   * @throws {PayloadTooLargeError} When the request body exceeds the allowed size limit.
   * @throws {UnsupportedContentTypeError} When the value of the `content-type` header is neither `text/plain` nor `text/plain; charset=utf-8`.
   */
  async text(encoding: BufferEncoding = 'utf-8') {
    const ct = this.header('content-type');
    if (!ct || !SUPPORTED_TEXT_CONTENT_TYPE.includes(ct)) {
      throw new UnsupportedContentTypeError();
    }

    const body = await this.body();
    if (!body) {
      return null;
    }
    return body.toString(encoding);
  }

  /**
   * Parses and returns the request body as a JSON object.
   *
   * Only HTTP methods `PATCH`, `POST`, `PUT` are allowed to have a body.
   * If the HTTP method is not one of these, it returns `null`.
   *
   * @throws {PayloadTooLargeError} When the request body exceeds the allowed size limit.
   * @throws {UnsupportedContentTypeError} When the value of the `content-type` header is neither `application/json` nor `application/json; charset=utf-8`.
   */
  async json<T>() {
    const ct = this.header('content-type');
    if (!ct || !SUPPORTED_JSON_CONTENT_TYPE.includes(ct)) {
      throw new UnsupportedContentTypeError();
    }

    const body = await this.body();
    if (!body) {
      return null;
    }
    return safeDestr<T>(body.toString('utf-8'));
  }
}
