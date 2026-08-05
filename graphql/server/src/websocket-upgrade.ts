import { type IncomingMessage,ServerResponse, STATUS_CODES } from 'node:http';
import type { Socket } from 'node:net';
import { type Duplex,PassThrough } from 'node:stream';

import type {
  Express,
  NextFunction,
  Request,
  RequestHandler,
  Response
} from 'express';

import { parseCookieValue, SESSION_COOKIE_NAME } from './middleware/cookie';
import { isCorsOriginAllowed } from './middleware/cors';

export const GRAPHILE_WEBSOCKET_PATH = '/graphql';
export const GRAPHILE_WEBSOCKET_ROUTE_NOT_FOUND_CODE =
  'GRAPHILE_WEBSOCKET_ROUTE_NOT_FOUND';
export const GRAPHILE_WEBSOCKET_BAD_UPGRADE_CODE =
  'GRAPHILE_WEBSOCKET_BAD_UPGRADE';
export const GRAPHILE_WEBSOCKET_ADMISSION_TIMEOUT_CODE =
  'GRAPHILE_WEBSOCKET_ADMISSION_TIMEOUT';
export const GRAPHILE_WEBSOCKET_ADMISSION_FAILED_CODE =
  'GRAPHILE_WEBSOCKET_ADMISSION_FAILED';
export const GRAPHILE_WEBSOCKET_AUTH_REJECTED_CODE =
  'GRAPHILE_WEBSOCKET_AUTH_REJECTED';
export const GRAPHILE_WEBSOCKET_SERVER_CLOSING_CODE =
  'GRAPHILE_WEBSOCKET_SERVER_CLOSING';

const DEFAULT_ADMISSION_TIMEOUT_MS = 180_000;

interface UpgradeResponse {
  status: number;
  code: string;
  retryAfterSeconds?: number;
}

interface PendingUpgrade {
  readonly request: IncomingMessage;
  readonly socket: Duplex;
  readonly head: Buffer;
  readonly response: ServerResponse;
  readonly responseSocket: Socket;
  readonly timer: ReturnType<typeof setTimeout>;
  readonly onSocketClose: () => void;
  readonly onSocketError: () => void;
  readonly onResponseFinish: () => void;
  readonly onResponseClose: () => void;
  readonly removePending: () => void;
  handedOff: boolean;
  terminal: boolean;
}

const pendingByRequest = new WeakMap<IncomingMessage, PendingUpgrade>();

const safeStatus = (status: number): number =>
  Number.isSafeInteger(status) && status >= 400 && status <= 599 ? status : 500;

const reasonPhrase = (status: number): string =>
  STATUS_CODES[status] ?? 'Error';

const writeUpgradeResponse = (
  socket: Duplex,
  response: UpgradeResponse
): void => {
  if (socket.destroyed || !socket.writable) return;
  const status = safeStatus(response.status);
  const body = JSON.stringify({ error: { code: response.code } });
  const headers = [
    `HTTP/1.1 ${status} ${reasonPhrase(status)}`,
    'Connection: close',
    'Content-Type: application/json; charset=utf-8',
    `Content-Length: ${Buffer.byteLength(body)}`,
    ...(response.retryAfterSeconds == null
      ? []
      : [`Retry-After: ${response.retryAfterSeconds}`]),
    '',
    body
  ].join('\r\n');
  try {
    socket.end(headers);
  } catch {
    socket.destroy();
  }
};

const websocketPath = (request: IncomingMessage): string => {
  const raw = request.url ?? '';
  const queryStart = raw.indexOf('?');
  return queryStart < 0 ? raw : raw.slice(0, queryStart);
};

const headerContainsToken = (
  value: string | string[] | undefined,
  expected: string
): boolean => {
  const values = Array.isArray(value) ? value : value == null ? [] : [value];
  return values.some((item) =>
    item.split(',').some((token) => token.trim().toLowerCase() === expected)
  );
};

const isGraphileWebSocketRequest = (request: IncomingMessage): boolean =>
  request.method === 'GET'
  && websocketPath(request) === GRAPHILE_WEBSOCKET_PATH
  && headerContainsToken(request.headers.connection, 'upgrade')
  && headerContainsToken(request.headers.upgrade, 'websocket');

const responseFailure = (response: ServerResponse): UpgradeResponse => {
  const status = safeStatus(response.statusCode);
  const retryAfterValue = response.getHeader('Retry-After');
  const parsedRetryAfter = typeof retryAfterValue === 'string'
    ? Number.parseInt(retryAfterValue, 10)
    : typeof retryAfterValue === 'number'
      ? retryAfterValue
      : undefined;
  const retryAfterSeconds = Number.isSafeInteger(parsedRetryAfter)
    && (parsedRetryAfter as number) >= 0
    ? parsedRetryAfter
    : undefined;
  return {
    status,
    code: status === 401 || status === 403
      ? GRAPHILE_WEBSOCKET_AUTH_REJECTED_CODE
      : status === 404
        ? GRAPHILE_WEBSOCKET_ROUTE_NOT_FOUND_CODE
        : GRAPHILE_WEBSOCKET_ADMISSION_FAILED_CODE,
    retryAfterSeconds
  };
};

export interface GraphileWebSocketUpgradeGatewayOptions {
  /** Total time allowed for routing, auth, safety checks, and a cold build. */
  admissionTimeoutMs?: number;
}

export interface GraphileWebSocketUpgradeGateway {
  handle(request: IncomingMessage, socket: Duplex, head: Buffer): void;
  close(): void;
  readonly pendingCount: number;
}

/**
 * Feed upgrade requests through the same Express application as HTTP without
 * exposing middleware-generated bodies on the wire. Express writes to a
 * private sink; only stable, metadata-free admission errors reach the client.
 */
export const createGraphileWebSocketUpgradeGateway = (
  app: Express,
  options: GraphileWebSocketUpgradeGatewayOptions = {}
): GraphileWebSocketUpgradeGateway => {
  const admissionTimeoutMs = options.admissionTimeoutMs
    ?? DEFAULT_ADMISSION_TIMEOUT_MS;
  if (!Number.isSafeInteger(admissionTimeoutMs) || admissionTimeoutMs <= 0) {
    throw new Error('WebSocket admission timeout must be a positive safe integer');
  }

  const pending = new Set<PendingUpgrade>();
  let closed = false;

  const cleanup = (context: PendingUpgrade): void => {
    if (context.terminal) return;
    context.terminal = true;
    clearTimeout(context.timer);
    pending.delete(context);
    pendingByRequest.delete(context.request);
    context.socket.removeListener('close', context.onSocketClose);
    context.socket.removeListener('error', context.onSocketError);
    context.response.removeListener('finish', context.onResponseFinish);
    context.response.removeListener('close', context.onResponseClose);
    if (context.response.socket === context.responseSocket) {
      context.response.detachSocket(context.responseSocket);
    }
    context.responseSocket.destroy();
  };

  const signalAdmissionAbort = (context: PendingUpgrade): void => {
    // Remove only the gateway's terminal listeners before emitting the ordinary
    // Express lifecycle signals. Request-scoped middleware must still observe
    // them, but the gateway must retain the caller-selected stable response.
    context.response.removeListener('finish', context.onResponseFinish);
    context.response.removeListener('close', context.onResponseClose);
    try {
      context.request.emit('aborted');
    } catch {
      // Cleanup and transport rejection remain mandatory even if an observer
      // violates EventEmitter's no-throw expectation.
    }
    if (!context.response.destroyed && !context.response.writableEnded) {
      try {
        context.response.emit('close');
      } catch {
        // See above: lifecycle observers are advisory to gateway cleanup.
      }
    }
  };

  const abortRequest = (context: PendingUpgrade): void => {
    if (context.handedOff || context.terminal) return;
    // Upgrade IncomingMessage instances are no longer owned by Node's HTTP
    // parser, so a peer disconnect does not reliably emit `aborted`. Re-emit
    // the ordinary request signal so queued Graphile builds release the waiter.
    signalAdmissionAbort(context);
    cleanup(context);
  };

  const rejectPending = (
    context: PendingUpgrade,
    response: UpgradeResponse
  ): void => {
    if (context.handedOff || context.terminal) return;
    cleanup(context);
    writeUpgradeResponse(context.socket, response);
  };

  const abortAndRejectPending = (
    context: PendingUpgrade,
    response: UpgradeResponse
  ): void => {
    if (context.handedOff || context.terminal) return;
    signalAdmissionAbort(context);
    rejectPending(context, response);
  };

  const handle = (
    request: IncomingMessage,
    socket: Duplex,
    head: Buffer
  ): void => {
    if (closed) {
      writeUpgradeResponse(socket, {
        status: 503,
        code: GRAPHILE_WEBSOCKET_SERVER_CLOSING_CODE,
        retryAfterSeconds: 1
      });
      return;
    }
    if (websocketPath(request) !== GRAPHILE_WEBSOCKET_PATH) {
      writeUpgradeResponse(socket, {
        status: 404,
        code: GRAPHILE_WEBSOCKET_ROUTE_NOT_FOUND_CODE
      });
      return;
    }
    if (!isGraphileWebSocketRequest(request)) {
      writeUpgradeResponse(socket, {
        status: 400,
        code: GRAPHILE_WEBSOCKET_BAD_UPGRADE_CODE
      });
      return;
    }

    // Never attach the real upgrade socket to ServerResponse: an API/auth/build
    // error may contain development detail. The response sink lets the normal
    // Express lifecycle run while the gateway emits only stable error codes.
    const response = new ServerResponse(request);
    const responseSocket = new PassThrough() as unknown as Socket;
    response.assignSocket(responseSocket);

    let context!: PendingUpgrade;
    const onSocketClose = (): void => abortRequest(context);
    const onSocketError = (): void => abortRequest(context);
    const onResponseFinish = (): void => {
      if (context.handedOff || context.terminal) return;
      rejectPending(context, responseFailure(response));
    };
    const onResponseClose = (): void => {
      if (context.handedOff || context.terminal) return;
      rejectPending(context, responseFailure(response));
    };
    const timer = setTimeout(() => {
      if (context.handedOff || context.terminal) return;
      // Abort the build waiter before closing the transport, then surface a
      // stable response that does not disclose the routed tenant or cache key.
      abortAndRejectPending(context, {
        status: 503,
        code: GRAPHILE_WEBSOCKET_ADMISSION_TIMEOUT_CODE,
        retryAfterSeconds: 1
      });
    }, admissionTimeoutMs);
    timer.unref?.();

    context = {
      request,
      socket,
      head,
      response,
      responseSocket,
      timer,
      onSocketClose,
      onSocketError,
      onResponseFinish,
      onResponseClose,
      removePending: () => pending.delete(context),
      handedOff: false,
      terminal: false
    };
    pending.add(context);
    pendingByRequest.set(request, context);
    socket.once('close', onSocketClose);
    socket.once('error', onSocketError);
    response.once('finish', onResponseFinish);
    response.once('close', onResponseClose);

    try {
      app(request, response);
    } catch {
      abortAndRejectPending(context, {
        status: 500,
        code: GRAPHILE_WEBSOCKET_ADMISSION_FAILED_CODE
      });
    }
  };

  return {
    handle,
    close: () => {
      if (closed) return;
      closed = true;
      for (const context of [...pending]) {
        abortAndRejectPending(context, {
          status: 503,
          code: GRAPHILE_WEBSOCKET_SERVER_CLOSING_CODE,
          retryAfterSeconds: 1
        });
      }
    },
    get pendingCount(): number {
      return pending.size;
    }
  };
};

export const isGraphileWebSocketUpgrade = (request: Request): boolean =>
  pendingByRequest.has(request as unknown as IncomingMessage);

/** Cookie-authenticated WebSockets require an origin a browser can prove. */
export const isGraphileWebSocketOriginAllowed = (
  request: Request,
  fallbackOrigin?: string
): boolean => {
  const origin = request.get('origin');
  const bearer = request.headers.authorization
    ?.toLowerCase().startsWith('bearer ') === true;
  const sessionCookie = parseCookieValue(request, SESSION_COOKIE_NAME);
  if (!origin) return bearer || !sessionCookie;
  if (!sessionCookie) {
    return isCorsOriginAllowed({
      origin,
      fallbackOrigin,
      api: request.api,
      requestHost: request.get('host')
    });
  }

  // A wildcard HTTP CORS policy and the localhost development convenience are
  // not sufficient for a credentialed WebSocket: browsers attach cookies to
  // the handshake but do not enforce CORS on the upgraded connection. Require
  // an exact configured origin or exact same-host origin for session auth.
  const normalizedOrigin = origin.trim();
  const fallback = fallbackOrigin?.trim();
  if (fallback && fallback !== '*' && normalizedOrigin === fallback) return true;
  if (
    [...(request.api?.corsOrigins ?? []), ...(request.api?.domains ?? [])]
      .includes(normalizedOrigin)
  ) {
    return true;
  }
  try {
    return new URL(normalizedOrigin).host.toLowerCase()
      === request.get('host')?.toLowerCase();
  } catch {
    return false;
  }
};

/** Mount immediately after API routing and before authentication/database I/O. */
export const createGraphileWebSocketOriginGuard = (
  fallbackOrigin?: string
): RequestHandler => (
  request: Request,
  response: Response,
  next: NextFunction
): void => {
  if (
    !isGraphileWebSocketUpgrade(request)
      || isGraphileWebSocketOriginAllowed(request, fallbackOrigin)
  ) {
    next();
    return;
  }
  response.status(403).json({
    error: {
      code: GRAPHILE_WEBSOCKET_AUTH_REJECTED_CODE,
      message: 'WebSocket origin is not allowed'
    }
  });
};

export interface AcceptedGraphileWebSocketUpgrade {
  readonly socket: Duplex;
  readonly head: Buffer;
}

export const getGraphileWebSocketUpgradeTransport = (
  request: Request
): AcceptedGraphileWebSocketUpgrade | undefined => {
  const context = pendingByRequest.get(request as unknown as IncomingMessage);
  return context ? { socket: context.socket, head: context.head } : undefined;
};

/**
 * Complete the synthetic response lifecycle before Grafserv owns the socket.
 * This releases request-scoped pool leases while retaining the routed API and
 * authenticated token on the IncomingMessage used by GraphQL over WebSocket.
 */
export const handoffGraphileWebSocketUpgrade = (
  request: Request,
  response: Response
): AcceptedGraphileWebSocketUpgrade => {
  const context = pendingByRequest.get(request as unknown as IncomingMessage);
  if (!context || context.response !== (response as unknown as ServerResponse)) {
    throw new Error('WebSocket upgrade context is unavailable');
  }
  if (context.terminal || context.handedOff || context.socket.destroyed) {
    throw new Error('WebSocket upgrade request is no longer active');
  }
  if (context.response.socket !== context.responseSocket) {
    throw new Error('Synthetic WebSocket admission response lost socket ownership');
  }

  context.handedOff = true;
  clearTimeout(context.timer);
  context.removePending();
  pendingByRequest.delete(context.request);
  context.socket.removeListener('close', context.onSocketClose);
  context.socket.removeListener('error', context.onSocketError);
  context.response.removeListener('finish', context.onResponseFinish);
  context.response.removeListener('close', context.onResponseClose);
  context.response.detachSocket(context.responseSocket);
  context.responseSocket.destroy();
  context.terminal = true;
  // `finish` would mean an HTTP body was completed. `close` accurately tells
  // request-scoped middleware that the synthetic response has been retired.
  context.response.emit('close');
  return { socket: context.socket, head: context.head };
};
