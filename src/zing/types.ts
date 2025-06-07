import type { Request } from './request.js';
import type { Response } from './response.js';

export type MIME = 'application/json; charset=utf-8' | 'text/plain; charset=utf-8';

export type HTTPHeaderKey =
  | 'access-control-allow-credentials'
  | 'access-control-allow-headers'
  | 'access-control-allow-methods'
  | 'access-control-allow-origin'
  | 'access-control-expose-headers'
  | 'access-control-max-age'
  | 'age'
  | 'allow'
  | 'cache-control'
  | 'content-length'
  | 'content-type'
  | 'cookie'
  | 'date'
  | 'etag'
  | 'expires'
  | 'last-modified'
  | 'location'
  | 'set-cookie'
  | `x-${string}`;

export type HTTPHeaderValue<Key extends HTTPHeaderKey> = Key extends 'content-type' ? MIME : string;

export type HTTPHeaders = {
  [Key in HTTPHeaderKey]?: HTTPHeaderValue<Key>;
};

export type HTTPMethod = 'GET' | 'HEAD' | 'PATCH' | 'POST' | 'PUT' | 'DELETE' | 'OPTIONS';

export type NextFunction = () => Promise<void>;
export type MiddlewareHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void> | void;

export type ErrorHandler = (err: unknown, req: Request, res: Response) => Promise<void> | void;

export type RouteHandler = (req: Request, res: Response) => Promise<void> | void;

export interface RouteData {
  method: HTTPMethod;
  route: string;
  handler: RouteHandler;
}

type JSONPrimitive = string | number | boolean | null | Date;
type JSONValue = JSONPrimitive | JSONArray | JSONObject;
type JSONArray = JSONValue[];

// eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style
export interface JSONObject {
  [key: string]: JSONValue;
}
