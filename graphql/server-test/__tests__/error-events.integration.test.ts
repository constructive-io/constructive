/**
 * Error-events integration tests
 *
 * When an authenticated mutation is refused with a structured registry code,
 * the server records `graphql.error` for the actor (principal, else user)
 * through the tenant's events module `record_event` (resolved from
 * metaschema_modules_public.events_module), in a fresh transaction after the
 * failed mutation. The client response is unchanged; the database decides what
 * each code means (e.g. PRINCIPAL_CHILD_WIDENS demotes a principal).
 *
 * The no-events-module case lives in error-events-no-module.integration so
 * each suite has its own process-wide module-loader cache.
 *
 * Run tests:
 *   pnpm test -- --testPathPattern=error-events
 */

import type { PgTestClient } from 'pgsql-test/test-client';
import type supertest from 'supertest';

import { connect, events, HUMAN_ID, PRINCIPAL_ID, refuse } from './error-events.shared';

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

describe('graphql.error (endpoint with an events module)', () => {
  it('records the refusal for a principal, with the principal as actor', async () => {
    const res = await refuse(request, 'principal-token');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ createChildPrincipal: null });
    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0].extensions.code).toBe('PRINCIPAL_CHILD_WIDENS');

    const { rows } = await events(pg);
    expect(rows).toEqual([
      {
        name: 'graphql.error',
        actor_id: PRINCIPAL_ID,
        payload: { code: 'PRINCIPAL_CHILD_WIDENS', operation: 'WidenChild' },
        request_id: 'refused-principal-token'
      }
    ]);
  });

  it('records the refusal for a human, with the user as actor', async () => {
    const res = await refuse(request, 'human-token');

    expect(res.status).toBe(200);
    expect(res.body.errors[0].extensions.code).toBe('PRINCIPAL_CHILD_WIDENS');

    const { rows } = await events(pg);
    expect(rows).toHaveLength(2);
    expect(rows[1]).toEqual({
      name: 'graphql.error',
      actor_id: HUMAN_ID,
      payload: { code: 'PRINCIPAL_CHILD_WIDENS', operation: 'WidenChild' },
      request_id: 'refused-human-token'
    });
  });

  it('records nothing for an unauthenticated request', async () => {
    const res = await refuse(request);

    expect(res.body.errors).toHaveLength(1);
    expect((await events(pg)).rows).toHaveLength(2);
  });
});
