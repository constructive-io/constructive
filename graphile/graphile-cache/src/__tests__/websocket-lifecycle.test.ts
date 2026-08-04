import { once } from 'node:events';
import { PassThrough } from 'node:stream';

import type { IncomingMessage } from 'http';

import {
  disposeUncachedEntry,
  getCacheCounters,
  GRAPHILE_WEBSOCKET_UNAVAILABLE_CODE,
  graphileCache,
  type GraphileCacheEntry,
  invokeEntryUpgradeHandler,
  retireGraphileCacheEntry,
  waitForEntryDisposal
} from '../graphile-cache';
import { createGraphileHttpHandler } from '../http-adapter';
import { GRAPHILE_REALTIME_UNAVAILABLE_CODE } from '../realtime-readiness';

const makeEntry = (
  overrides: Partial<GraphileCacheEntry> = {}
): GraphileCacheEntry => ({
  pgl: {
    release: jest.fn(async (): Promise<void> => undefined)
  } as unknown as GraphileCacheEntry['pgl'],
  serv: {} as GraphileCacheEntry['serv'],
  handler: createGraphileHttpHandler(),
  httpServer: null,
  cacheKey: 'websocket-lifecycle',
  createdAt: Date.now(),
  ...overrides
});

const request = (): IncomingMessage => ({
  aborted: false
}) as IncomingMessage;

describe('cached Graphile WebSocket lifecycle', () => {
  it('retains an exact entry until its accepted socket closes', async () => {
    const socket = new PassThrough();
    const upgradeHandler = jest.fn();
    const entry = makeEntry({ upgradeHandler });
    const countersBefore = getCacheCounters();

    expect(invokeEntryUpgradeHandler(entry, request(), socket, Buffer.alloc(0))).toBe(true);
    expect(upgradeHandler).toHaveBeenCalledWith(
      expect.anything(),
      socket,
      expect.any(Buffer)
    );
    expect(entry.inflight).toBe(1);
    expect(entry.websocketSockets?.has(socket)).toBe(true);
    expect(getCacheCounters().websocketUpgradesStarted).toBe(
      countersBefore.websocketUpgradesStarted + 1
    );
    expect(getCacheCounters().websocketUpgradesCompleted).toBe(
      countersBefore.websocketUpgradesCompleted
    );

    socket.destroy();
    await once(socket, 'close');

    expect(entry.inflight).toBe(0);
    expect(entry.websocketSockets?.size).toBe(0);
    expect(getCacheCounters().websocketUpgradesCompleted).toBe(
      countersBefore.websocketUpgradesCompleted + 1
    );
  });

  it('transfers the outer transport only after the exact generation is retained', () => {
    const socket = new PassThrough();
    const events: string[] = [];
    const entry = makeEntry({
      upgradeHandler: jest.fn(() => events.push('grafserv'))
    });

    expect(invokeEntryUpgradeHandler(
      entry,
      request(),
      socket,
      Buffer.from('head'),
      { onAccepted: () => events.push('accepted') }
    )).toBe(true);

    expect(events).toEqual(['accepted', 'grafserv']);
    expect(entry.inflight).toBe(1);
    socket.destroy();
  });

  it('terminates long-lived sockets before disposing their generation', async () => {
    const socket = new PassThrough();
    const entry = makeEntry({ upgradeHandler: jest.fn() });
    expect(invokeEntryUpgradeHandler(entry, request(), socket, Buffer.alloc(0))).toBe(true);

    await disposeUncachedEntry(entry);

    expect(socket.destroyed).toBe(true);
    expect(entry.inflight).toBe(0);
    expect(entry.pgl.release).toHaveBeenCalledTimes(1);
  });

  it('retires the exact resident generation and its sockets on a fatal audit', async () => {
    const socket = new PassThrough();
    const entry = makeEntry({
      cacheKey: 'websocket-fatal-audit',
      upgradeHandler: jest.fn()
    });
    graphileCache.set(entry.cacheKey, entry);
    expect(invokeEntryUpgradeHandler(
      entry,
      request(),
      socket,
      Buffer.alloc(0)
    )).toBe(true);

    expect(retireGraphileCacheEntry(
      entry,
      Object.assign(new Error('listener role changed'), {
        code: 'INSUFFICIENT_PRIVILEGE'
      })
    )).toBe(true);

    await once(socket, 'close');
    await expect(waitForEntryDisposal(entry, 100)).resolves.toBe(true);
    expect(graphileCache.peek(entry.cacheKey)).toBeUndefined();
    expect(entry.realtimeHealth).toMatchObject({
      status: 'failed',
      failureCode: 'INSUFFICIENT_PRIVILEGE'
    });
    expect(entry.inflight).toBe(0);
    expect(entry.pgl.release).toHaveBeenCalledTimes(1);
  });

  it('releases PgSubscriber before cursor cleanup in a saturated max=2 pool', async () => {
    const socket = new PassThrough();
    const events: string[] = [];
    // Model the two production runtime slots while a subscription is live:
    // one PgSubscriber LISTEN checkout and one cursor-tracker checkout.
    let occupiedSlots = 2;
    const entry = makeEntry({
      upgradeHandler: jest.fn(),
      pgl: {
        release: jest.fn(async () => {
          events.push('postgraphile-release');
        })
      } as unknown as GraphileCacheEntry['pgl'],
      releasePresetServices: jest.fn(async () => {
        events.push('preset-services-release');
        occupiedSlots -= 1;
      }),
      realtimeManager: {
        stop: jest.fn(async () => {
          events.push('realtime-stop');
          if (occupiedSlots >= 2) {
            throw new Error('timeout exceeded when trying to connect');
          }
          occupiedSlots -= 1;
        })
      }
    });
    expect(invokeEntryUpgradeHandler(entry, request(), socket, Buffer.alloc(0))).toBe(true);

    await expect(disposeUncachedEntry(entry, 'max-2-live-subscription')).resolves.toBeUndefined();

    expect(socket.destroyed).toBe(true);
    expect(occupiedSlots).toBe(0);
    expect(events).toEqual([
      'postgraphile-release',
      'preset-services-release',
      'realtime-stop'
    ]);
  });

  it('releases a caller-owned shared subscriber and attestation exactly once', async () => {
    const realtimeSubscriber = {
      release: jest.fn(async (): Promise<void> => undefined)
    };
    const realtimeRoleAttestation = {
      snapshot: jest.fn(),
      revalidateIfDue: jest.fn(async () => true),
      release: jest.fn()
    };
    const entry = makeEntry({
      realtimeSubscriber,
      realtimeRoleAttestation
    });

    const first = disposeUncachedEntry(entry, 'shared-owner');
    const second = disposeUncachedEntry(entry, 'shared-owner');
    expect(first).toBe(second);
    await first;

    expect(realtimeRoleAttestation.release).toHaveBeenCalledTimes(1);
    expect(realtimeSubscriber.release).toHaveBeenCalledTimes(1);
  });

  it('fails closed with a stable response when no upgrade handler exists', async () => {
    const socket = new PassThrough();
    let response = '';
    socket.on('data', (chunk) => {
      response += chunk.toString();
    });
    const ended = once(socket, 'end');

    const rejected = jest.fn();
    expect(invokeEntryUpgradeHandler(
      makeEntry(),
      request(),
      socket,
      Buffer.alloc(0),
      { onRejected: rejected }
    )).toBe(true);
    await ended;

    expect(response).toContain('HTTP/1.1 503');
    expect(response).toContain(GRAPHILE_WEBSOCKET_UNAVAILABLE_CODE);
    expect(rejected).toHaveBeenCalledTimes(1);
  });

  it('rejects a WebSocket upgrade when its listener-role attestation is stale', async () => {
    const socket = new PassThrough();
    let response = '';
    socket.on('data', (chunk) => {
      response += chunk.toString();
    });
    const ended = once(socket, 'end');
    const entry = makeEntry({
      upgradeHandler: jest.fn(),
      realtimeRoleAttestation: {
        snapshot: jest.fn(() => ({
          version: 1,
          mode: 'shared-exact',
          listenerIdentity: 'opaque-listener-identity',
          auditVersion: 'pg-notification-role:v1',
          role: 'listener',
          database: 'tenant_a',
          lastAttestedAt: 1,
          validUntil: 2,
          checks: 1,
          status: 'healthy',
          failureCode: null as string | null,
          failedAt: null as number | null
        })),
        revalidateIfDue: jest.fn(async () => true),
        release: jest.fn()
      }
    });

    const rejected = jest.fn();
    expect(invokeEntryUpgradeHandler(
      entry,
      request(),
      socket,
      Buffer.alloc(0),
      { onRejected: rejected }
    )).toBe(true);
    await ended;

    expect(entry.upgradeHandler).not.toHaveBeenCalled();
    expect(rejected).toHaveBeenCalledTimes(1);
    expect(response).toContain('HTTP/1.1 503');
    expect(response).toContain(GRAPHILE_REALTIME_UNAVAILABLE_CODE);
  });
});
