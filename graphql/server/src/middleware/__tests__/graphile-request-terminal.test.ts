import { EventEmitter } from 'node:events';

import type { Request, Response } from 'express';

import { isGraphileWebSocketOriginAllowed } from '../../websocket-upgrade';
import {
  getGraphileTransportRequest,
  isGraphileRequestTerminal
} from '../graphile';

const makeRequest = (overrides: Record<string, unknown> = {}): Request =>
  Object.assign(new EventEmitter(), {
    aborted: false,
    destroyed: false,
    readableEnded: false,
    complete: false,
    socket: { destroyed: false },
    ...overrides
  }) as unknown as Request;

const makeResponse = (overrides: Record<string, unknown> = {}): Response =>
  Object.assign(new EventEmitter(), {
    destroyed: false,
    writableEnded: false,
    ...overrides
  }) as unknown as Response;

describe('Graphile request terminal detection', () => {
  it('keeps serving a parsed POST whose consumed request stream was auto-destroyed', () => {
    const request = makeRequest({
      destroyed: true,
      readableEnded: true,
      complete: true
    });

    expect(isGraphileRequestTerminal(request, makeResponse())).toBe(false);
  });

  it.each([
    ['request aborted', { aborted: true }, {}],
    ['socket destroyed', { socket: { destroyed: true } }, {}],
    ['response destroyed', {}, { destroyed: true }],
    ['response ended', {}, { writableEnded: true }]
  ])('detects a terminal %s', (_label, request, response) => {
    expect(isGraphileRequestTerminal(
      makeRequest(request),
      makeResponse(response)
    )).toBe(true);
  });
});

describe('Graphile transport request identity', () => {
  it('uses the already-routed and authenticated request for WebSocket execution', () => {
    const request = makeRequest({
      api: { databaseId: 'database-a', schema: ['a_public'] },
      token: { user_id: 'actor-a' }
    });

    expect(getGraphileTransportRequest({
      ws: { request }
    } as unknown as Partial<Grafast.RequestContext>)).toBe(request);
  });

  it('keeps the existing Express request path for HTTP execution', () => {
    const request = makeRequest({
      api: { databaseId: 'database-b', schema: ['b_public'] },
      token: { user_id: 'actor-b' }
    });

    expect(getGraphileTransportRequest({
      expressv4: { req: request }
    } as unknown as Partial<Grafast.RequestContext>)).toBe(request);
  });
});

describe('Graphile WebSocket origin policy', () => {
  const originRequest = (
    headers: Record<string, string>,
    corsOrigins: string[] = []
  ): Request => makeRequest({
    headers,
    api: {
      databaseId: 'database-a',
      dbname: 'tenant_a',
      schema: ['a_public'],
      anonRole: 'tenant_anon',
      roleName: 'tenant_user',
      domains: [],
      corsOrigins
    },
    get(name: string) {
      return headers[name.toLowerCase()];
    }
  });

  it('allows same-host and configured browser origins', () => {
    expect(isGraphileWebSocketOriginAllowed(originRequest({
      host: 'a.example.test',
      origin: 'https://a.example.test',
      cookie: 'constructive_session=session-a'
    }))).toBe(true);
    expect(isGraphileWebSocketOriginAllowed(originRequest({
      host: 'a.example.test',
      origin: 'https://console.example.test',
      cookie: 'constructive_session=session-a'
    }, ['https://console.example.test']))).toBe(true);
  });

  it('does not authorize cookie WebSockets through wildcard or localhost shortcuts', () => {
    expect(isGraphileWebSocketOriginAllowed(originRequest({
      host: 'a.example.test',
      origin: 'https://attacker.example.test',
      cookie: 'constructive_session=session-a'
    }), '*')).toBe(false);
    expect(isGraphileWebSocketOriginAllowed(originRequest({
      host: 'api.localhost:3000',
      origin: 'http://attacker.localhost:3001',
      cookie: 'constructive_session=session-a'
    }))).toBe(false);
  });

  it('rejects a cross-origin browser and originless cookie authentication', () => {
    expect(isGraphileWebSocketOriginAllowed(originRequest({
      host: 'a.example.test',
      origin: 'https://attacker.example.test'
    }))).toBe(false);
    expect(isGraphileWebSocketOriginAllowed(originRequest({
      host: 'a.example.test',
      cookie: 'constructive_session=session-a'
    }))).toBe(false);
  });

  it('allows originless bearer and anonymous non-browser clients', () => {
    expect(isGraphileWebSocketOriginAllowed(originRequest({
      host: 'a.example.test',
      authorization: 'Bearer token-a'
    }))).toBe(true);
    expect(isGraphileWebSocketOriginAllowed(originRequest({
      host: 'a.example.test'
    }))).toBe(true);
  });
});
