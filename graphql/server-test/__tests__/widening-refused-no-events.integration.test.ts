/**
 * Widening refused on an endpoint whose database has no events module: the
 * refusal is returned unchanged, nothing is recorded, nothing errors.
 *
 * Run tests:
 *   pnpm test -- --testPathPattern=widening-refused-no-events
 */

import type { PgTestClient } from 'pgsql-test/test-client';
import type supertest from 'supertest';

import { connect, events, refuse } from './widening-refused.shared';

jest.setTimeout(30000);

let pg: PgTestClient;
let request: supertest.Agent;
let teardown: () => Promise<void>;

beforeAll(async () => {
  ({ pg, request, teardown } = await connect({ withEventsModule: false }));
});

afterAll(async () => {
  await teardown();
});

describe('principal.widening_refused (endpoint without an events module)', () => {
  it('refuses the principal without error and records nothing', async () => {
    const res = await refuse(request, 'principal-token');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ createChildPrincipal: null });
    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0].extensions.code).toBe('PRINCIPAL_CHILD_WIDENS');

    const { rows } = await events(pg);
    expect(rows).toHaveLength(0);
  });
});
