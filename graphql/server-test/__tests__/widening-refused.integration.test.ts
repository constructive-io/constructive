/**
 * Widening-refused event integration tests
 *
 * When a mutation is refused with PRINCIPAL_CHILD_WIDENS, the server records
 * `principal.widening_refused` for the requesting principal through the
 * tenant's events module `record_event` (resolved from
 * metaschema_modules_public.events_module), in a fresh transaction after the
 * failed mutation. The client response is unchanged.
 *
 * The no-events-module case lives in widening-refused-no-events.integration
 * so each suite has its own process-wide module-loader cache.
 *
 * Run tests:
 *   pnpm test -- --testPathPattern=widening-refused
 */

import type { PgTestClient } from 'pgsql-test/test-client';
import type supertest from 'supertest';

import { connect, events, HUMAN_ID, PRINCIPAL_ID, refuse } from './widening-refused.shared';

jest.setTimeout(30000);

let pg: PgTestClient;
let request: supertest.Agent;
let teardown: () => Promise<void>;

beforeAll(async () => {
  ({ pg, request, teardown } = await connect({ withEventsModule: true }));
});

afterAll(async () => {
  await teardown();
});

describe('principal.widening_refused (endpoint with an events module)', () => {
  it('records the event for a principal whose widening is refused', async () => {
    const res = await refuse(request, 'principal-token');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ createChildPrincipal: null });
    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0].extensions.code).toBe('PRINCIPAL_CHILD_WIDENS');

    const { rows } = await events(pg);
    expect(rows).toEqual([
      {
        name: 'principal.widening_refused',
        actor_id: PRINCIPAL_ID,
        payload: { code: 'PRINCIPAL_CHILD_WIDENS', operation: 'WidenChild' },
        request_id: 'widening-principal-token'
      }
    ]);
  });

  it('records nothing for a human whose widening is refused', async () => {
    const before = (await events(pg)).rows.length;
    const res = await refuse(request, 'human-token');

    expect(res.status).toBe(200);
    expect(res.body.errors[0].extensions.code).toBe('PRINCIPAL_CHILD_WIDENS');

    const { rows } = await events(pg);
    expect(rows).toHaveLength(before);
    expect(rows.some((r: { actor_id: string }) => r.actor_id === HUMAN_ID)).toBe(false);
  });
});
