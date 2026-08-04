import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';

import type { Request } from 'express';
import type { GraphileCacheEntry } from 'graphile-cache';

import {
  createGraphileWebSocketOperationAdmission,
  GRAPHILE_WEBSOCKET_CAPTCHA_REQUIRED_CODE,
  GRAPHILE_WEBSOCKET_OPERATION_SAFETY_CODE
} from '../websocket-operation-admission-plugin';

const contract = {
  cacheKey: 'contract-a',
  databaseId: 'database-a',
  databaseName: 'tenant_a',
  apiId: 'api-a',
  schemas: ['a_public'],
  authenticatedRole: 'a_user',
  anonymousRole: 'a_anon',
  dependencySchemas: ['realtime_a'],
  runtimeSafetyRequired: true
} as const;

const makeFixture = (options: {
  enableCaptcha?: boolean;
  query?: string;
  operationName?: string;
} = {}) => {
  const socket = new PassThrough();
  const request = Object.assign(new EventEmitter(), {
    aborted: false,
    socket,
    api: {
      databaseId: contract.databaseId,
      dbname: contract.databaseName,
      apiId: contract.apiId,
      schema: [...contract.schemas],
      roleName: contract.authenticatedRole,
      anonRole: contract.anonymousRole,
      authSettings: options.enableCaptcha
        ? { enableCaptcha: true }
        : undefined
    }
  }) as unknown as Request;
  const entry = {
    cacheKey: contract.cacheKey,
    websocketSockets: new Set([socket]),
    disposing: false
  } as unknown as GraphileCacheEntry;
  const ensureRuntimeSafety = jest.fn(async (): Promise<void> => undefined);
  const revalidateRealtimeRole = jest.fn(async (): Promise<boolean> => true);
  const retire = jest.fn((): boolean => true);
  const admission = createGraphileWebSocketOperationAdmission(contract, {
    ensureRuntimeSafety,
    revalidateRealtimeRole,
    retire
  });
  admission.bind(entry);
  const callback = (
    admission.plugin.grafserv?.middleware?.onSubscribe as {
      callback: (next: () => unknown, event: unknown) => Promise<unknown>;
    }
  ).callback;
  const event = {
    ctx: { extra: { request } },
    message: {
      payload: {
        query: options.query ?? 'subscription Events { events { id } }',
        operationName: options.operationName
      }
    }
  };
  return {
    admission,
    callback,
    ensureRuntimeSafety,
    entry,
    event,
    request,
    retire,
    revalidateRealtimeRole,
    socket
  };
};

describe('Graphile WebSocket per-operation safety admission', () => {
  it('revalidates both exact safety boundaries before every operation', async () => {
    const fixture = makeFixture();
    const next = jest.fn(() => ({ accepted: true }));

    await expect(fixture.callback(next, fixture.event)).resolves.toEqual({
      accepted: true
    });
    await expect(fixture.callback(next, fixture.event)).resolves.toEqual({
      accepted: true
    });

    expect(fixture.ensureRuntimeSafety).toHaveBeenCalledTimes(2);
    expect(fixture.revalidateRealtimeRole).toHaveBeenCalledTimes(2);
    expect(next).toHaveBeenCalledTimes(2);
    expect(fixture.retire).not.toHaveBeenCalled();
  });

  it('retires the exact generation when runtime-role safety cannot be proved', async () => {
    const fixture = makeFixture();
    const failure = new Error('unsafe runtime role');
    fixture.ensureRuntimeSafety.mockRejectedValueOnce(failure);
    const next = jest.fn();

    const result = await fixture.callback(next, fixture.event) as Array<{
      extensions?: Record<string, unknown>;
    }>;

    expect(result[0]?.extensions?.code).toBe(
      GRAPHILE_WEBSOCKET_OPERATION_SAFETY_CODE
    );
    expect(fixture.retire).toHaveBeenCalledWith(fixture.entry, failure);
    expect(fixture.revalidateRealtimeRole).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('retires the generation when listener-role refresh fails', async () => {
    const fixture = makeFixture();
    fixture.revalidateRealtimeRole.mockResolvedValueOnce(false);
    const next = jest.fn();

    const result = await fixture.callback(next, fixture.event) as unknown[];

    expect(result).toHaveLength(1);
    expect(fixture.retire).toHaveBeenCalledTimes(1);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a request whose routed tenant differs from the bound generation', async () => {
    const fixture = makeFixture();
    fixture.request.api.databaseId = 'database-b';
    const next = jest.fn();

    const result = await fixture.callback(next, fixture.event) as unknown[];

    expect(result).toHaveLength(1);
    expect(fixture.retire).toHaveBeenCalledTimes(1);
    expect(fixture.ensureRuntimeSafety).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('does not enter GraphQL when invalidation wins an asynchronous audit race', async () => {
    const fixture = makeFixture();
    fixture.ensureRuntimeSafety.mockImplementationOnce(async () => {
      fixture.entry.disposing = true;
    });
    const next = jest.fn();

    const result = await fixture.callback(next, fixture.event) as unknown[];

    expect(result).toHaveLength(1);
    expect(next).not.toHaveBeenCalled();
  });

  it.each([
    [
      'an aliased root field',
      'mutation Harmless { allowed: signUp }',
      'Harmless'
    ],
    [
      'a fragment root field',
      `mutation Harmless { ...Protected }
       fragment Protected on Mutation { requestPasswordReset }`,
      'Harmless'
    ],
    [
      'the selected operation in a multi-operation document',
      'query Safe { viewer { id } } mutation Protected { resetPassword }',
      'Protected'
    ]
  ])('rejects CAPTCHA-protected WebSocket mutations through %s', async (
    _label,
    query,
    operationName
  ) => {
    const fixture = makeFixture({ enableCaptcha: true, query, operationName });
    const next = jest.fn();

    const result = await fixture.callback(next, fixture.event) as Array<{
      extensions?: Record<string, unknown>;
    }>;

    expect(result[0]?.extensions?.code).toBe(
      GRAPHILE_WEBSOCKET_CAPTCHA_REQUIRED_CODE
    );
    expect(fixture.ensureRuntimeSafety).not.toHaveBeenCalled();
    expect(fixture.revalidateRealtimeRole).not.toHaveBeenCalled();
    expect(fixture.retire).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it.each([
    ['an ambiguous document', 'query A { viewer { id } } query B { viewer { id } }'],
    ['a malformed document', 'mutation {']
  ])('fails closed when a CAPTCHA-enabled WebSocket sends %s', async (
    _label,
    query
  ) => {
    const fixture = makeFixture({ enableCaptcha: true, query });
    const next = jest.fn();

    const result = await fixture.callback(next, fixture.event) as Array<{
      extensions?: Record<string, unknown>;
    }>;

    expect(result[0]?.extensions?.code).toBe(
      GRAPHILE_WEBSOCKET_CAPTCHA_REQUIRED_CODE
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('keeps ordinary subscriptions available when CAPTCHA is enabled', async () => {
    const fixture = makeFixture({
      enableCaptcha: true,
      query: 'subscription Events { events { id } }',
      operationName: 'Events'
    });
    const next = jest.fn(() => ({ accepted: true }));

    await expect(fixture.callback(next, fixture.event)).resolves.toEqual({
      accepted: true
    });
    expect(fixture.ensureRuntimeSafety).toHaveBeenCalledTimes(1);
    expect(fixture.revalidateRealtimeRole).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
