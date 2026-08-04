import {
  createRealtimeDriver,
  type RealtimeClientFactoryInput,
  realtimeHeaders,
  realtimeWebSocketUrl
} from '../realtime';
import type { GraphqlSurface, TenantTarget } from '../types';

const surface = (
  customer: string,
  tenant: string,
  foreignCustomer: string
): GraphqlSurface => {
  const payload = `${customer}:${tenant}:resident`;
  const physicalDatabaseIdentity = `database-${customer}`;
  return {
    name: `api-${tenant}`,
    buildContract: `${customer}-${tenant}`,
    url: `http://127.0.0.1:3410/customer/${customer}/tenant/${tenant}/graphql`,
    headers: { 'accept-language': 'es' },
    warmup: { name: 'warm', capability: 'generated', query: '{ __typename }' },
    operations: [{ name: 'read', capability: 'generated', query: '{ __typename }' }],
    canaries: [{
      name: 'isolation',
      query: '{ tenantToken }',
      requiredMatches: [{ path: '/data/tenantToken', value: tenant }],
      forbiddenMatches: [{ path: '/data/tenantToken', value: 'foreign' }]
    }],
    realtime: {
      headersFromEnvironment: { authorization: 'CPERF_TEST_TOKEN' },
      subscription: {
        query: 'subscription Resident { changed { tenantId physicalDatabaseIdentity payload } }',
        requiredMatches: [
          { path: '/data/changed/tenantId', value: tenant },
          {
            path: '/data/changed/physicalDatabaseIdentity',
            value: physicalDatabaseIdentity
          }
        ],
        forbiddenMatches: [
          { path: '/data/changed/tenantId', value: 'foreign' },
          {
            path: '/data/changed/physicalDatabaseIdentity',
            value: `database-${foreignCustomer}`
          }
        ]
      },
      prime: {
        query: 'mutation Prime($payload: String!) { prime(payload: $payload) { tenantId physicalDatabaseIdentity payload } }',
        variables: { payload },
        requiredMatches: [
          { path: '/data/prime/tenantId', value: tenant },
          {
            path: '/data/prime/physicalDatabaseIdentity',
            value: physicalDatabaseIdentity
          }
        ],
        forbiddenMatches: [
          { path: '/data/prime/tenantId', value: 'foreign' },
          {
            path: '/data/prime/physicalDatabaseIdentity',
            value: `database-${foreignCustomer}`
          }
        ]
      },
      correlation: {
        primeVariable: 'payload',
        primeResponsePath: '/data/prime/payload',
        subscriptionEventPath: '/data/changed/payload'
      }
    }
  };
};

const fleet = (): TenantTarget[] => [
  { id: 'customer-1', surfaces: [surface('customer-1', 'a', 'customer-2')] },
  { id: 'customer-2', surfaces: [surface('customer-2', 'b', 'customer-1')] }
];

const waitFor = async (predicate: () => boolean, timeoutMs = 1_000): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  while (!predicate() && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 2));
  }
  if (!predicate()) throw new Error('TEST_WAIT_TIMEOUT');
};

describe('external realtime driver', () => {
  it('uses each exact route, verifies its event, and keeps credentials out of evidence', async () => {
    const clients = new Map<string, {
      input: RealtimeClientFactoryInput;
      sink?: { next(value: unknown): void };
      unsubscribed: number;
      disposed: number;
    }>();
    const created: string[] = [];
    const requested: string[] = [];
    const previousCorrelationByRoute = new Map<string, string>();
    const clientFactory = (input: RealtimeClientFactoryInput) => {
      created.push(input.url);
      const state = { input, unsubscribed: 0, disposed: 0 } as {
        input: RealtimeClientFactoryInput;
        sink?: { next(value: unknown): void };
        unsubscribed: number;
        disposed: number;
      };
      clients.set(input.url, state);
      return {
        subscribe: (_payload: unknown, sink: { next(value: unknown): void }) => {
          state.sink = sink;
          queueMicrotask(input.onConnected);
          return () => { state.unsubscribed++; };
        },
        dispose: async () => {
          state.disposed++;
          input.onClosed();
        }
      };
    };
    const fetchImpl = async (url: string | URL | Request, init?: RequestInit) => {
      const href = String(url);
      requested.push(href);
      expect((init?.headers as Record<string, string>).authorization).toBe('driver-secret');
      const parsedBody = JSON.parse(String(init?.body));
      const payload = parsedBody.variables.payload as string;
      const tenant = href.includes('/tenant/a/') ? 'a' : 'b';
      const customer = href.includes('/customer/customer-1/') ? 'customer-1' : 'customer-2';
      const wsUrl = href.replace(/^http:/, 'ws:');
      // A cursor replay from the same exact tenant/database is legitimate, but
      // even a nonce that proved the prior round must not prove this one.
      clients.get(wsUrl)!.sink!.next({
        data: {
          changed: {
            tenantId: tenant,
            physicalDatabaseIdentity: `database-${customer}`,
            payload: previousCorrelationByRoute.get(href)
              ?? 'earlier-valid-event'
          }
        }
      });
      clients.get(wsUrl)!.sink!.next({
        data: {
          changed: {
            tenantId: tenant,
            physicalDatabaseIdentity: `database-${customer}`,
            payload
          }
        }
      });
      previousCorrelationByRoute.set(href, payload);
      return new Response(JSON.stringify({
        data: {
          prime: {
            tenantId: tenant,
            physicalDatabaseIdentity: `database-${customer}`,
            payload
          }
        }
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    };
    const driver = createRealtimeDriver(fleet(), {
      concurrency: 1,
      timeoutMs: 1_000
    }, {
      clientFactory,
      fetch: fetchImpl as typeof fetch,
      environment: { CPERF_TEST_TOKEN: 'driver-secret' },
      correlationFactory: (surfaceKey, sequence) =>
        `test-correlation:${surfaceKey}:${sequence}:fresh-round`,
      sleep: async () => undefined
    });

    await driver.startAndVerify();
    expect(created).toEqual([
      'ws://127.0.0.1:3410/customer/customer-1/tenant/a/graphql',
      'ws://127.0.0.1:3410/customer/customer-2/tenant/b/graphql'
    ]);
    expect(requested).toEqual([
      'http://127.0.0.1:3410/customer/customer-1/tenant/a/graphql',
      'http://127.0.0.1:3410/customer/customer-2/tenant/b/graphql'
    ]);
    expect(driver.snapshot()).toMatchObject({
      expected: 2,
      active: 2,
      verified: 2,
      deliveryIntervalMs: 60_000,
      deliveryEvents: 2,
      deliveryRoundsStarted: 2,
      deliveryRoundsVerified: 2,
      deliveryRoundsPending: 0,
      errors: []
    });
    expect(JSON.stringify(driver.snapshot())).not.toContain('driver-secret');
    driver.assertHealthy();

    // Later legitimate workload writes change the payload but must preserve
    // the permanent tenant/database invariants.
    clients.get(created[0])!.sink!.next({
      data: {
        changed: {
          tenantId: 'a',
          physicalDatabaseIdentity: 'database-customer-1',
          payload: 'tenant-a-workload-update'
        }
      }
    });
    driver.assertHealthy();

    await driver.verifyDeliveryNow();
    expect(driver.snapshot()).toMatchObject({
      deliveryEvents: 4,
      deliveryRoundsStarted: 4,
      deliveryRoundsVerified: 4,
      deliveryRoundsPending: 0
    });
    for (const configured of driver.snapshot().surfaces) {
      expect(configured.correlationReceipts).toHaveLength(2);
      expect(configured.correlationReceipts.every((receipt) =>
        receipt.issuedSha256 === receipt.primeResponseSha256
        && receipt.issuedSha256 === receipt.eventSha256
      )).toBe(true);
    }

    await driver.dispose();
    expect([...clients.values()].every((client) =>
      client.unsubscribed === 1 && client.disposed === 1
    )).toBe(true);
    expect(driver.snapshot().active).toBe(0);
    await driver.dispose();
    expect([...clients.values()].every((client) => client.disposed === 1)).toBe(true);
  });

  it('periodically requires a fresh matching event and never overlaps rounds', async () => {
    let sink: { next(value: unknown): void } | null = null;
    let primeCalls = 0;
    let activePrimeCalls = 0;
    let maximumActivePrimeCalls = 0;
    let releasePeriodicPrime: (() => void) | null = null;
    const periodicPrimeStarted = new Promise<void>((resolve) => {
      releasePeriodicPrime = resolve;
    });
    let allowPeriodicPrimeToFinish: (() => void) | null = null;
    const periodicPrimeCanFinish = new Promise<void>((resolve) => {
      allowPeriodicPrimeToFinish = resolve;
    });
    const driver = createRealtimeDriver([fleet()[0]], {
      concurrency: 1,
      timeoutMs: 1_000,
      deliveryIntervalMs: 20
    }, {
      environment: { CPERF_TEST_TOKEN: 'driver-secret' },
      clientFactory: (input) => ({
        subscribe: (_payload, nextSink) => {
          sink = nextSink;
          queueMicrotask(input.onConnected);
          return () => undefined;
        },
        dispose: async () => undefined
      }),
      fetch: (async (_url, init) => {
        primeCalls++;
        activePrimeCalls++;
        maximumActivePrimeCalls = Math.max(maximumActivePrimeCalls, activePrimeCalls);
        const payload = JSON.parse(String(init?.body)).variables.payload;
        if (primeCalls === 2) {
          releasePeriodicPrime!();
          await periodicPrimeCanFinish;
        }
        sink!.next({
          data: {
            changed: {
              tenantId: 'a',
              physicalDatabaseIdentity: 'database-customer-1',
              payload
            }
          }
        });
        activePrimeCalls--;
        return new Response(JSON.stringify({
          data: {
            prime: {
              tenantId: 'a',
              physicalDatabaseIdentity: 'database-customer-1',
              payload
            }
          }
        }), { status: 200 });
      }) as typeof fetch
    });

    try {
      await driver.startAndVerify();
      driver.beginTimedCoverage(80);
      await periodicPrimeStarted;
      expect(driver.snapshot()).toMatchObject({
        deliveryEvents: 1,
        deliveryRoundsStarted: 2,
        deliveryRoundsVerified: 1,
        deliveryRoundsPending: 1
      });

      expect(primeCalls).toBe(2);
      allowPeriodicPrimeToFinish!();
      await waitFor(() =>
        driver.snapshot().timedCoverage?.verifiedRecurringRounds === 3
      );
      await new Promise((resolve) => setTimeout(resolve, 25));
      const coverage = await driver.finishTimedCoverage();

      expect(maximumActivePrimeCalls).toBe(1);
      expect(coverage).toMatchObject({
        version: 2,
        expectedRecurringRounds: 3,
        startedRecurringRounds: 3,
        verifiedRecurringRounds: 3,
        deadlineLateRecurringRounds: 0,
        complete: true,
        primeRequests: 3,
        surfaces: [{
          tenantId: 'customer-1',
          surface: 'api-a',
          expectedRecurringRounds: 3,
          startedRecurringRounds: 3,
          verifiedRecurringRounds: 3
        }]
      });
      expect(coverage.surfaces[0].issuedCorrelationSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(coverage.surfaces[0].verifiedCorrelationSha256).toBe(
        coverage.surfaces[0].issuedCorrelationSha256
      );
      expect(coverage.deliveryP99Ms).toBeGreaterThanOrEqual(0);
      expect(driver.snapshot()).toMatchObject({
        deliveryEvents: 4,
        deliveryRoundsStarted: 4,
        deliveryRoundsVerified: 4,
        deliveryRoundsPending: 0,
        errors: []
      });
    } finally {
      await driver.dispose();
    }
  });

  it('fails when a later round receives no matching event', async () => {
    let sink: { next(value: unknown): void } | null = null;
    let primeCalls = 0;
    const driver = createRealtimeDriver([fleet()[0]], {
      concurrency: 1,
      timeoutMs: 35,
      // Leave enough scheduling headroom that this exercises the event timeout,
      // rather than the separate missed-deadline path on a busy test runner.
      deliveryIntervalMs: 50
    }, {
      environment: { CPERF_TEST_TOKEN: 'driver-secret' },
      clientFactory: (input) => ({
        subscribe: (_payload, nextSink) => {
          sink = nextSink;
          queueMicrotask(input.onConnected);
          return () => undefined;
        },
        dispose: async () => undefined
      }),
      fetch: (async (_url, init) => {
        primeCalls++;
        const payload = JSON.parse(String(init?.body)).variables.payload;
        if (primeCalls === 1) {
          sink!.next({
            data: {
              changed: {
                tenantId: 'a',
                physicalDatabaseIdentity: 'database-customer-1',
                payload
              }
            }
          });
        }
        return new Response(JSON.stringify({
          data: {
            prime: {
              tenantId: 'a',
              physicalDatabaseIdentity: 'database-customer-1',
              payload
            }
          }
        }), { status: 200 });
      }) as typeof fetch
    });

    try {
      await driver.startAndVerify();
      driver.beginTimedCoverage(200);
      await waitFor(() => driver.snapshot().errors.length > 0);
      expect(primeCalls).toBe(2);
      expect(driver.snapshot()).toMatchObject({
        verified: 1,
        deliveryEvents: 1,
        deliveryRoundsStarted: 2,
        deliveryRoundsVerified: 1,
        deliveryRoundsPending: 0
      });
      await expect(driver.verifyDeliveryNow()).rejects.toThrow(
        'CPERF_REALTIME_EVENT_TIMEOUT:customer-1/api-a'
      );
    } finally {
      await driver.dispose();
    }
  });

  it('fails conclusively when the event came from another physical database', async () => {
    let sink: { next(value: unknown): void } | null = null;
    const driver = createRealtimeDriver([fleet()[0]], {
      concurrency: 1,
      timeoutMs: 1_000
    }, {
      environment: { CPERF_TEST_TOKEN: 'driver-secret' },
      clientFactory: (input) => ({
        subscribe: (_payload, nextSink) => {
          sink = nextSink;
          queueMicrotask(input.onConnected);
          return () => undefined;
        },
        dispose: async () => undefined
      }),
      fetch: (async (_url, init) => {
        const payload = JSON.parse(String(init?.body)).variables.payload;
        sink!.next({
          data: {
            changed: {
              tenantId: 'a',
              physicalDatabaseIdentity: 'database-customer-2',
              payload
            }
          }
        });
        return new Response(JSON.stringify({
          data: {
            prime: {
              tenantId: 'a',
              physicalDatabaseIdentity: 'database-customer-1',
              payload
            }
          }
        }), { status: 200 });
      }) as typeof fetch,
      sleep: async () => undefined
    });

    await expect(driver.startAndVerify()).rejects.toThrow(
      'CPERF_REALTIME_FOREIGN_PAYLOAD:customer-1/api-a'
    );
    expect(driver.snapshot().verified).toBe(0);
    await driver.dispose();
  });

  it('rejects a correlation digest reused by another exact route', async () => {
    const sinks = new Map<string, { next(value: unknown): void }>();
    const reused = 'same-correlation-across-all-routes';
    const driver = createRealtimeDriver(fleet(), {
      concurrency: 1,
      timeoutMs: 1_000
    }, {
      environment: { CPERF_TEST_TOKEN: 'driver-secret' },
      correlationFactory: () => reused,
      clientFactory: (input) => ({
        subscribe: (_payload, sink) => {
          sinks.set(input.url, sink);
          queueMicrotask(input.onConnected);
          return () => undefined;
        },
        dispose: async () => undefined
      }),
      fetch: (async (url, init) => {
        const href = String(url);
        const payload = JSON.parse(String(init?.body)).variables.payload;
        const tenant = href.includes('/tenant/a/') ? 'a' : 'b';
        const customer = href.includes('/customer/customer-1/')
          ? 'customer-1'
          : 'customer-2';
        sinks.get(href.replace(/^http:/, 'ws:'))!.next({
          data: {
            changed: {
              tenantId: tenant,
              physicalDatabaseIdentity: `database-${customer}`,
              payload
            }
          }
        });
        return new Response(JSON.stringify({
          data: {
            prime: {
              tenantId: tenant,
              physicalDatabaseIdentity: `database-${customer}`,
              payload
            }
          }
        }), { status: 200 });
      }) as typeof fetch
    });

    await expect(driver.startAndVerify()).rejects.toThrow(
      'CPERF_REALTIME_CORRELATION_REUSED:customer-2/api-b'
    );
    await driver.dispose();
  });

  it('records a post-verification drop and fails the health check', async () => {
    let callbacks: RealtimeClientFactoryInput | null = null;
    let sink: { next(value: unknown): void } | null = null;
    const target = fleet()[0];
    const driver = createRealtimeDriver([target], {
      concurrency: 1,
      timeoutMs: 1_000
    }, {
      environment: { CPERF_TEST_TOKEN: 'driver-secret' },
      clientFactory: (input) => {
        callbacks = input;
        return {
          subscribe: (_payload, nextSink) => {
            sink = nextSink;
            queueMicrotask(input.onConnected);
            return () => undefined;
          },
          dispose: async () => undefined
        };
      },
      fetch: (async (_url, init) => {
        const payload = JSON.parse(String(init?.body)).variables.payload;
        sink!.next({
          data: {
            changed: {
              tenantId: 'a',
              physicalDatabaseIdentity: 'database-customer-1',
              payload
            }
          }
        });
        return new Response(JSON.stringify({
          data: {
            prime: {
              tenantId: 'a',
              physicalDatabaseIdentity: 'database-customer-1',
              payload
            }
          }
        }), { status: 200 });
      }) as typeof fetch,
      sleep: async () => undefined
    });

    await driver.startAndVerify();
    callbacks!.onClosed();
    expect(() => driver.assertHealthy()).toThrow(
      'CPERF_REALTIME_TRANSPORT_DROPPED:customer-1/api-a'
    );
    await driver.dispose();
  });

  it('requires secret headers from the runtime environment', () => {
    const configured = fleet()[0].surfaces[0];
    expect(() => realtimeHeaders(configured, {})).toThrow(
      'CPERF_REALTIME_HEADER_ENV_MISSING:api-a:CPERF_TEST_TOKEN'
    );
    expect(realtimeWebSocketUrl(configured.url)).toBe(
      'ws://127.0.0.1:3410/customer/customer-1/tenant/a/graphql'
    );
    expect(() => realtimeWebSocketUrl(`${configured.url}?token=secret`)).toThrow(
      'CPERF_REALTIME_SURFACE_URL_INVALID'
    );
    expect(() => createRealtimeDriver([], {
      concurrency: 1,
      timeoutMs: 1_000,
      deliveryIntervalMs: 0
    })).toThrow('CPERF_REALTIME_DELIVERY_INTERVAL_INVALID');
  });
});
