'use strict';

const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const {
  authorizeRetainedMemoryCheckpoint,
  collectRetainedMemoryCheckpoint,
  makeGraphileActivityVector,
  makeRetainedMemoryGuard,
  parseServerOptions,
} = require('./server.cjs');

const MIB = 1024 ** 2;

const guard = (overrides = {}) => makeRetainedMemoryGuard({
  pid: 42,
  graphileInFlight: 0,
  residentBuildContracts: ['contract-a'],
  graphileActivityByBuildContract: [{
    buildContract: 'contract-a',
    inflight: 0,
    websocketSockets: 0,
    transientHttpInFlight: 0,
  }],
  cacheCounters: {
    httpRequestsStarted: 0,
    httpRequestsCompleted: 0,
    websocketUpgradesStarted: 0,
    websocketUpgradesCompleted: 0,
    evictions: 0,
    buildRefusals: 0,
  },
  realtime: {
    managersExpected: 0,
    managersActive: 0,
    connectionsExpected: 0,
    connectionsAccepted: 0,
    connectionsActive: 0,
    connectionDrops: 0,
    connectionErrors: 0,
    connectionsPerSurface: [],
  },
  buildCounters: { started: 1, succeeded: 1, failed: 0 },
  ...overrides,
});

const liveRealtimeGuard = (overrides = {}) => guard({
  graphileActivityByBuildContract: [{
    buildContract: 'contract-a',
    inflight: 1,
    websocketSockets: 1,
    transientHttpInFlight: 0,
  }],
  cacheCounters: {
    httpRequestsStarted: 4,
    httpRequestsCompleted: 4,
    websocketUpgradesStarted: 1,
    websocketUpgradesCompleted: 0,
  },
  realtime: {
    managersExpected: 1,
    managersActive: 1,
    connectionsExpected: 1,
    connectionsAccepted: 1,
    connectionsActive: 1,
    connectionDrops: 0,
    connectionErrors: 0,
    connectionsPerSurface: [{
      key: 'customer-1:a',
      accepted: 1,
      active: 1,
      peakActive: 1,
      drops: 0,
      errors: 0,
    }],
  },
  ...overrides,
});

describe('physical density retained-memory checkpoint', () => {
  it('requires the explicit benchmark flag and matching loopback bearer token', () => {
    const request = (address, token) => ({
      socket: { remoteAddress: address },
      get: (name) => name === 'authorization' ? `Bearer ${token}` : undefined,
    });
    const options = {
      benchmarkRetainedHeapEnabled: true,
      observabilityToken: 'checkpoint-secret',
    };
    assert.equal(authorizeRetainedMemoryCheckpoint(
      request('127.0.0.1', 'checkpoint-secret'), options
    ), true);
    assert.equal(authorizeRetainedMemoryCheckpoint(
      request('10.0.0.2', 'checkpoint-secret'), options
    ), false);
    assert.equal(authorizeRetainedMemoryCheckpoint(
      request('127.0.0.1', 'wrong-secret'), options
    ), false);
    assert.equal(authorizeRetainedMemoryCheckpoint(
      request('127.0.0.1', 'checkpoint-secret'), {
        ...options,
        benchmarkRetainedHeapEnabled: false,
      }
    ), false);
  });

  it('parses the benchmark flag from the environment only', () => {
    const options = parseServerOptions([
      '--manifest', '/tmp/provision.json',
      '--secrets', '/tmp/secrets.json',
      '--run-purpose', 'measurement',
      '--clone-id', 'measurement-clone-test',
    ], {
      GRAPHQL_CPERF_RETAINED_HEAP_ENABLED: 'true',
      GRAPHQL_OBSERVABILITY_TOKEN: 'checkpoint-secret',
    });
    assert.equal(options.benchmarkRetainedHeapEnabled, true);
    assert.equal(options.observabilityToken, 'checkpoint-secret');
  });

  it('runs eight full-GC turns and accepts only converged last-three samples', async () => {
    let gcCalls = 0;
    let reads = 0;
    let monotonic = 0n;
    const heapMiB = [120, 112, 106, 103, 101, 100.2, 100.1, 100];
    const checkpoint = await collectRetainedMemoryCheckpoint({
      forceGc: () => { gcCalls += 1; },
      readMemory: () => ({
        heapUsed: Math.round(heapMiB[reads++] * MIB),
        external: 10 * MIB,
        arrayBuffers: 2 * MIB,
        rss: 180 * MIB,
      }),
      readGuard: () => guard(),
      monotonicNow: () => ++monotonic,
      yieldTurn: async () => undefined,
    });
    assert.equal(gcCalls, 8);
    assert.equal(checkpoint.samples.length, 8);
    assert.equal(checkpoint.stableSampleCount, 3);
    assert.equal(checkpoint.stable, true);
    assert.deepEqual(checkpoint.errors, []);
    assert.equal(checkpoint.guardBefore.stateSha256, checkpoint.guardAfter.stateSha256);
  });

  it('subtracts expected long-lived sockets from exact per-contract activity', () => {
    const vector = makeGraphileActivityVector([
      {
        cacheKey: 'contract-b',
        inflight: 3,
        websocketSockets: new Set([{}, {}]),
      },
      {
        cacheKey: 'contract-a',
        inflight: 1,
        websocketSockets: new Set([{}]),
      },
    ]);
    assert.deepEqual(vector, [
      {
        buildContract: 'contract-a',
        inflight: 1,
        websocketSockets: 1,
        transientHttpInFlight: 0,
      },
      {
        buildContract: 'contract-b',
        inflight: 3,
        websocketSockets: 2,
        transientHttpInFlight: 1,
      },
    ]);
  });

  it('permits stable expected realtime sockets during full GC', async () => {
    let gcCalls = 0;
    let monotonic = 0n;
    const checkpoint = await collectRetainedMemoryCheckpoint({
      forceGc: () => { gcCalls += 1; },
      readMemory: () => ({
        heapUsed: 100 * MIB,
        external: 10 * MIB,
        arrayBuffers: 2 * MIB,
        rss: 180 * MIB,
      }),
      readGuard: () => liveRealtimeGuard(),
      monotonicNow: () => ++monotonic,
      yieldTurn: async () => undefined,
    });
    assert.equal(gcCalls, 8);
    assert.equal(checkpoint.stable, true);
    assert.equal(checkpoint.guardBefore.graphileInFlight, 0);
    assert.equal(checkpoint.guardBefore.graphileWebsocketSockets, 1);
    assert.equal(checkpoint.guardBefore.realtimeResident, true);
  });

  it('hashes balanced handler lifecycles that begin and end between reads', () => {
    const baseline = guard({
      cacheCounters: {
        httpRequestsStarted: 4,
        httpRequestsCompleted: 4,
        websocketUpgradesStarted: 0,
        websocketUpgradesCompleted: 0,
      },
    });
    const shortHttpRequest = guard({
      cacheCounters: {
        httpRequestsStarted: 5,
        httpRequestsCompleted: 5,
        websocketUpgradesStarted: 0,
        websocketUpgradesCompleted: 0,
      },
    });
    const shortWebsocket = guard({
      cacheCounters: {
        httpRequestsStarted: 5,
        httpRequestsCompleted: 5,
        websocketUpgradesStarted: 1,
        websocketUpgradesCompleted: 1,
      },
    });
    assert.notEqual(baseline.stateSha256, shortHttpRequest.stateSha256);
    assert.notEqual(shortHttpRequest.stateSha256, shortWebsocket.stateSha256);
  });

  it('binds pg-cache capacity and failure counters into the stable guard', () => {
    const baseline = guard({
      pgCacheMonotonicCounters: {
        capacityEvictions: 0,
        capacityRefusals: 0,
        disposalFailures: 0,
      },
    });
    const changed = guard({
      pgCacheMonotonicCounters: {
        capacityEvictions: 0,
        capacityRefusals: 1,
        disposalFailures: 0,
      },
    });
    assert.notEqual(baseline.stateSha256, changed.stateSha256);
  });

  it('fails closed when heap convergence or process state changes', async () => {
    let reads = 0;
    let guards = 0;
    const heapMiB = [100, 100, 100, 100, 100, 100, 104, 100];
    const checkpoint = await collectRetainedMemoryCheckpoint({
      forceGc: () => undefined,
      readMemory: () => ({
        heapUsed: heapMiB[reads++] * MIB,
        external: 10 * MIB,
        arrayBuffers: 2 * MIB,
        rss: 180 * MIB,
      }),
      readGuard: () => guard({ counter: guards++ }),
      monotonicNow: (() => {
        let value = 0n;
        return () => ++value;
      })(),
      yieldTurn: async () => undefined,
    });
    assert.equal(checkpoint.stable, false);
    assert.ok(checkpoint.errors.some((error) =>
      error.startsWith('PDCF_RETAINED_HEAP_NOT_CONVERGED:')
    ));
    assert.ok(checkpoint.errors.includes(
      'PDCF_RETAINED_MEMORY_RESIDENCY_OR_COUNTERS_CHANGED'
    ));
  });

  it('does not force GC while Graphile work is in flight', async () => {
    let gcCalls = 0;
    await assert.rejects(collectRetainedMemoryCheckpoint({
      forceGc: () => { gcCalls += 1; },
      readGuard: () => guard({ graphileInFlight: 1 }),
    }), /PDCF_RETAINED_MEMORY_IN_FLIGHT:1/);
    assert.equal(gcCalls, 0);
  });

  it('does not force GC when expected realtime sockets are missing', async () => {
    let gcCalls = 0;
    await assert.rejects(collectRetainedMemoryCheckpoint({
      forceGc: () => { gcCalls += 1; },
      readGuard: () => liveRealtimeGuard({
        graphileActivityByBuildContract: [{
          buildContract: 'contract-a',
          inflight: 0,
          websocketSockets: 0,
          transientHttpInFlight: 0,
        }],
        cacheCounters: {
          httpRequestsStarted: 4,
          httpRequestsCompleted: 4,
          websocketUpgradesStarted: 1,
          websocketUpgradesCompleted: 1,
        },
        realtime: {
          managersExpected: 1,
          managersActive: 1,
          connectionsExpected: 1,
          connectionsAccepted: 1,
          connectionsActive: 0,
          connectionDrops: 1,
          connectionErrors: 0,
          connectionsPerSurface: [{
            key: 'customer-1:a',
            accepted: 1,
            active: 0,
            peakActive: 1,
            drops: 1,
            errors: 0,
          }],
        },
      }),
    }), /PDCF_RETAINED_MEMORY_REALTIME_NOT_RESIDENT:0:0:1/);
    assert.equal(gcCalls, 0);
  });
});
