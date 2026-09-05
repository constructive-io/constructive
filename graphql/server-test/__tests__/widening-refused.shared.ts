import path from 'path';
import type { PgTestClient } from 'pgsql-test/test-client';
import type supertest from 'supertest';

import { getConnections, seed } from '../src';

const sharedSeedRoot = path.join(__dirname, '..', '..', '..', '__fixtures__', 'seed');
const localSeedRoot = path.join(__dirname, '..', '__fixtures__', 'seed', 'widening-refused');
const pgpmWorkspace = path.join(sharedSeedRoot, '..', '..');
const schemas = ['simple-pets-public', 'simple-pets-pets-public'];
const metaSchemas = [
  'catalog_private',
  'routing_public',
  'apps_public',
  'metaschema_public',
  'metaschema_modules_public'
];

const HOST = 'app.test.constructive.io';
export const HUMAN_ID = 'bbbbbbbb-0000-4000-8000-000000000001';
export const PRINCIPAL_ID = 'cccccccc-0000-4000-8000-000000000001';

const MUTATION = `
  mutation WidenChild {
    createChildPrincipal(input: { capabilities: ["*"] }) { clientMutationId }
  }
`;

export const connect = ({ withEventsModule }: { withEventsModule: boolean }) =>
  getConnections(
    {
      schemas,
      authRole: 'anonymous',
      server: { useRouting: true, api: { isPublic: true, metaSchemas } }
    },
    [
      seed.pgpm(pgpmWorkspace),
      seed.sqlfile([
        path.join(sharedSeedRoot, 'app-schemas', 'simple-pets', 'schema.sql'),
        path.join(sharedSeedRoot, 'scoped', 'test-data.sql'),
        path.join(localSeedRoot, 'schema.sql'),
        ...(withEventsModule ? [path.join(localSeedRoot, 'events-module.sql')] : [])
      ])
    ]
  );

/** Issue the mutation that is refused with PRINCIPAL_CHILD_WIDENS. */
export const refuse = (request: supertest.Agent, token: 'human-token' | 'principal-token') =>
  request
    .post('/graphql')
    .set('Host', HOST)
    .set('Authorization', `Bearer ${token}`)
    .set('X-Request-Id', `widening-${token}`)
    .send({ query: MUTATION });

export const events = (pg: PgTestClient) =>
  pg.query(
    `SELECT name, actor_id, payload, request_id FROM "simple-pets-events-public".app_events ORDER BY created_at`
  );
