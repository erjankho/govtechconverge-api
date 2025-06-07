import type { IncomingMessage, ServerResponse } from 'node:http';

import { Request } from './request.js';
import { Response } from './response.js';

/**
 * A helper class that wraps the node HTTP request and response.
 */
export class Context {
  #params: Record<string, string> = {};

  readonly req: Request;
  readonly res: Response;

  constructor(req: IncomingMessage, res: ServerResponse) {
    this.req = new Request(req, this);
    this.res = new Response(res);
  }

  get params() {
    return this.#params;
  }

  setParams(params?: Record<string, string>) {
    if (!params) {
      return;
    }
    this.#params = params;
  }
}
