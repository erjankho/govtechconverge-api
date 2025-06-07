import type { IncomingMessage, Server as HTTPServer, ServerResponse } from 'node:http';
import { createServer } from 'node:http';
import type { Socket } from 'node:net';

export { createRouter } from './router.js';

export interface ServerOptions {
  /**
   * The duration (in milliseconds) to wait for active connections to finish sending data before terminating them.
   */
  shutdownGracePeriod: number;
}

const DEFAULT_SHUTDOWN_GRACE_PERIOD = 10_000;

/**
 * An HTTP server that supports graceful shutdown.
 */
export class Server {
  #server: HTTPServer;
  #options: ServerOptions;

  #requestCountPerSocket = new Map<Socket, number>();
  #isShuttingDown = false;

  onerror: ((err: Error) => Promise<void> | void) | null = null;

  constructor(
    dispatch: (req: IncomingMessage, res: ServerResponse) => Promise<void> | void,
    options: Partial<ServerOptions> = {},
  ) {
    this.#server = createServer(dispatch);
    this.#options = {
      shutdownGracePeriod: options.shutdownGracePeriod ?? DEFAULT_SHUTDOWN_GRACE_PERIOD,
    };
  }

  /**
   * Starts listen for incoming connections.
   * @param port - The port on which the server will listen.
   */
  async listen(port: number) {
    return new Promise<void>((resolve) => {
      // Track active connections.
      this.#server.on('connection', (socket) => {
        this.#requestCountPerSocket.set(socket, 0);
        socket.once('close', () => this.#requestCountPerSocket.delete(socket));
      });

      // Track ongoing requests.
      this.#server.on('request', (req, res) => {
        this.#requestCountPerSocket.set(
          req.socket,
          (this.#requestCountPerSocket.get(req.socket) ?? 0) + 1,
        );

        res.once('finish', () => {
          this.#requestCountPerSocket.set(
            req.socket,
            (this.#requestCountPerSocket.get(req.socket) ?? 1) - 1,
          );

          // If we are in the process of shutting down and the socket goes idle, close the socket.
          if (this.#isShuttingDown && this.#requestCountPerSocket.get(req.socket) === 0) {
            req.socket.end();
          }
        });
      });

      this.#server.on('error', (err) => {
        this.onerror?.(err);
      });

      this.#server.listen(port, resolve);
    });
  }

  /**
   * Gracefully shutdown the server.
   *
   * Initiates a shutdown process by closing the server to new connections,
   * waiting for ongoing requests to complete within the specificed grace
   * period, before forcefully terminating them.
   *
   * If the server is already shutting down, subsequent calls will have no effect.
   */
  async shutdown() {
    if (this.#isShuttingDown) {
      return;
    }
    this.#isShuttingDown = true;

    let timeout: NodeJS.Timeout | null = null;
    try {
      await new Promise<void>((resolve, reject) => {
        this.#server.close((err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        });

        this.#server.closeIdleConnections();

        timeout = setTimeout(() => {
          this.#server.closeAllConnections();
        }, this.#options.shutdownGracePeriod);
      });
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
  }
}
