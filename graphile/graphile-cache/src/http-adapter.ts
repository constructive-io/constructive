import type { Server as HttpServer } from 'node:http';
import type { Server as HttpsServer } from 'node:https';

import express, { type Express, type Router } from 'express';

/** The narrow part of ExpressGrafserv used by a cached HTTP-only instance. */
export interface GrafservExpressAttachment {
  addTo(
    app: Express,
    server: HttpServer | HttpsServer | null,
    addExclusiveWebsocketHandler?: boolean
  ): PromiseLike<void> | void;
}

export interface GraphileHttpAttachmentOptions {
  /**
   * The caller will route upgrades to this exact cached instance from the
   * shared outer HTTP server. Grafserv must never install an exclusive
   * listener for a tenant instance because that listener would reject every
   * other tenant's path.
   */
  sharedWebsocketRouting?: boolean;
}

/** Allocate only the middleware router that the shared outer server invokes. */
export const createGraphileHttpHandler = (): Router => express.Router();

/**
 * Attach Grafserv's HTTP middleware without a private Node server.
 *
 * With exclusive websocket handling disabled, Grafserv's Express adapter only
 * calls `app.use(...)`; Router implements that exact runtime contract. A cached
 * per-tenant server never listens, so websocket upgrades must be owned by the
 * shared outer server rather than retained on an unreachable dummy server.
 */
export const attachGraphileHttpHandler = (
  serv: GrafservExpressAttachment,
  handler: Router,
  resolvedPreset: unknown,
  options: GraphileHttpAttachmentOptions = {}
): PromiseLike<void> | void => {
  if (
    (resolvedPreset as any)?.grafserv?.websockets === true
    && options.sharedWebsocketRouting !== true
  ) {
    throw new Error(
      '[graphile-cache] Cached Grafserv instances cannot own WebSocket ' +
      'upgrades; configure a tenant-aware upgrade handler on the shared server'
    );
  }
  return serv.addTo(handler as unknown as Express, null, false);
};
