import { buildContext, createDefaultRegistry, DEFAULT_REQUEST_PROTECTION } from '@constructive-io/express-context';
import type { ConstructiveOptions } from '@constructive-io/graphql-types';
import type { Express, Request, Response } from 'express';
import { SafeError } from 'grafast';
import type { GraphileCacheEntry } from 'graphile-cache';
import { IncomingMessage, ServerResponse } from 'http';
import type { Socket } from 'net';
import type { Duplex } from 'stream';

import { authenticateRequest, getBearerToken } from './auth';

const upgrades = new WeakMap<IncomingMessage, { socket: Duplex; head: Buffer }>();
const loaders = createDefaultRegistry();

export const isWebSocketUpgrade = (req: IncomingMessage): boolean => upgrades.has(req);

export function routeWebSocketUpgrade(app: Express, req: IncomingMessage, socket: Duplex, head: Buffer): void {
  if (req.url?.split('?')[0] !== '/graphql') {
    socket.end('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n');
    return;
  }
  upgrades.set(req, { socket, head });
  const res = new ServerResponse(req);
  res.assignSocket(socket as Socket);
  res.once('finish', () => socket.end());
  socket.once('error', () => socket.destroy());
  app(req, res);
}

export function forwardWebSocketUpgrade(req: Request, res: Response, instance: GraphileCacheEntry): boolean {
  const upgrade = upgrades.get(req);
  if (!upgrade) return false;
  upgrades.delete(req);
  const { socket, head } = upgrade;
  if (!instance.httpServer.listenerCount('upgrade')) {
    res.status(404).end();
    return true;
  }
  res.detachSocket(socket as Socket);
  instance.httpServer.emit('upgrade', req, socket, head);
  return true;
}

export async function authenticatedWebSocketRequest(
  request: IncomingMessage,
  params: Record<string, unknown> | undefined,
  opts: ConstructiveOptions
): Promise<Request> {
  const req = Object.create(request) as Request;
  req.headers = { ...request.headers };
  req.token = undefined;
  const requiresAuth = req.api?.isPublic !== false && !!req.api?.rlsModule;
  delete req.headers.cookie;
  const authorizations = Object.entries(params ?? {}).filter(([key]) => key.toLowerCase() === 'authorization');
  if (authorizations.length) {
    if (authorizations.length !== 1 || typeof authorizations[0][1] !== 'string') {
      throw new SafeError('Invalid authorization', { code: 'UNAUTHENTICATED' });
    }
    req.headers.authorization = authorizations[0][1];
  }
  if (!getBearerToken(req) && requiresAuth) {
    throw new SafeError('Authentication required', { code: 'UNAUTHENTICATED' });
  }
  const failure = await authenticateRequest(req, opts);
  if (failure) {
    throw new SafeError(failure.error.message, failure.error.toExtensions());
  }
  if (!req.token && requiresAuth) {
    throw new SafeError('Authentication required', { code: 'UNAUTHENTICATED' });
  }
  req.constructive = buildContext(req, { pg: opts.pg, loaders });
  const standing = await req.constructive?.useModule('standing');
  if (standing && (!standing.exists || standing.suspended)) {
    throw new SafeError('Access suspended', { code: 'ACCESS_SUSPENDED' });
  }
  req.requestProtection = await req.constructive?.useModule('requestProtection') ?? DEFAULT_REQUEST_PROTECTION;
  return req;
}
