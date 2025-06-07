import { HTTPStatusCode } from './http-status-code.js';

export class BaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BaseError';
  }
}

export class PayloadTooLargeError extends BaseError {
  readonly code: HTTPStatusCode;

  constructor() {
    super('The payload exceeds the maximum allowed size.');
    this.name = 'PayloadTooLargeError';
    this.code = HTTPStatusCode.PayloadTooLarge;
  }
}

export class UnsupportedContentTypeError extends BaseError {
  readonly code: HTTPStatusCode;

  constructor() {
    super('The provided content type is unsupported.');
    this.name = 'UnsupportedContentTypeError';
    this.code = HTTPStatusCode.UnsupportedMediaType;
  }
}
