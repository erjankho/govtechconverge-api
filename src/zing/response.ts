import { Buffer } from 'node:buffer';
import type { ServerResponse } from 'node:http';

import { HTTPStatusCode } from './http-status-code.js';
import type { HTTPHeaderKey, HTTPHeaders, HTTPHeaderValue, JSONObject } from './types.js';

/**
 * A helper class to manage HTTP response.
 */
export class Response {
  readonly node: ServerResponse;

  constructor(res: ServerResponse) {
    this.node = res;
  }

  /**
   * Returns `true` if the response is finished, else `false`.
   */
  get finished() {
    return this.node.writableFinished;
  }

  /**
   * Sets a specified HTTP header on the response
   * @param key - The header key, excluding `set-cookie`.
   * @param value - The value for the specified header key.
   */
  header<Key extends Exclude<HTTPHeaderKey, 'set-cookie'>>(key: Key, value: HTTPHeaderValue<Key>) {
    this.node.setHeader(key, value);
  }

  /**
   * Sends a JSON response with the specified status code and data.
   * Does nothing if the response is already finished.
   * @param code - The status code for the repsonse.
   * @param data - The data to send as JSON.
   */
  json(code: HTTPStatusCode, data: JSONObject) {
    if (this.finished) {
      return;
    }

    if (this.node.req.method === 'HEAD') {
      this.node.writeHead(code).end();
      return;
    }

    const raw = JSON.stringify(data);
    const headers: HTTPHeaders = {
      'content-type': 'application/json; charset=utf-8',
      'content-length': Buffer.byteLength(raw).toString(),
    };

    this.node.writeHead(code, headers);
    this.node.end(raw);
  }

  /**
   * Sends a plain text response with the specified status code and data.
   * Does nothing if the response is already finished.
   * @param code - The status code for the response.
   * @param data - The data to send as plain text.
   */
  text(code: HTTPStatusCode, data: string | number | boolean) {
    if (this.finished) {
      return;
    }

    if (this.node.req.method === 'HEAD') {
      this.node.writeHead(code).end();
      return;
    }

    const headers: HTTPHeaders = {
      'content-type': 'text/plain; charset=utf-8',
      'content-length': Buffer.byteLength(data.toString()).toString(),
    };

    this.node.writeHead(code, headers);
    this.node.end(data);
  }

  /**
   * Sends a `200 OK` response.
   * Does nothing if the response is already finished.
   */
  ok() {
    if (this.finished) {
      return;
    }

    this.node.writeHead(HTTPStatusCode.OK).end();
  }

  /**
   * Sends a `201 Created` response.
   * Does nothing if the response is already finished.
   */
  created() {
    if (this.finished) {
      return;
    }

    this.node.writeHead(HTTPStatusCode.Created).end();
  }

  /**
   * Sends a `204 No Content` response.
   * Does nothing if the response is already finished.
   */
  noContent() {
    if (this.finished) {
      return;
    }

    this.node.writeHead(HTTPStatusCode.NoContent).end();
  }
}
