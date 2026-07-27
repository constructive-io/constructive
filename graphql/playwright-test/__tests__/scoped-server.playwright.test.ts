/**
 * Scoped-server Playwright test.
 *
 * Proves the Playwright harness can drive the *production*
 * `@constructive-io/graphql-server` (not the dev server): every request is
 * resolved through the scoped-routing plane
 * (`constructive_routing_public.resolve_route()`), so this suite seeds real
 * routing/database records and reaches the api surface via its seeded host.
 *
 * Contrast with `server.playwright.test.ts`, which uses the single-tenant dev
 * server (`useRouting` defaults to `false`).
 */
import { expect, test } from '@playwright/test';
import path from 'path';

import { getConnectionsWithServer, seed } from '../src';

const sharedSeedRoot = path.join(__dirname, '..', '..', '..', '__fixtures__', 'seed');
const shared = (...segments: string[]) => path.join(sharedSeedRoot, ...segments);
const pgpmWorkspace = path.join(sharedSeedRoot, '..', '..');

const schemas = ['simple-pets-public', 'simple-pets-pets-public'];
const scopedMetaSchemas = [
  'constructive_catalog_public',
  'constructive_routing_public',
  'constructive_apps_public',
  'metaschema_public',
  'metaschema_modules_public'
];

const scopedSeedAdapters = () => [
  seed.pgpm(pgpmWorkspace),
  seed.sqlfile([
    shared('app-schemas', 'simple-pets', 'schema.sql'),
    shared('scoped', 'test-data.sql'),
    shared('app-schemas', 'simple-pets', 'test-data.sql')
  ])
];

test.describe('playwright-test scoped server (real graphql-server)', () => {
  test('resolves the seeded host through the scoped routing plane', async ({ request }) => {
    test.setTimeout(60000);

    const { server, teardown } = await getConnectionsWithServer(
      {
        schemas,
        authRole: 'anonymous',
        server: {
          useRouting: true,
          api: {
            routingSchema: 'constructive_routing_public',
            isPublic: true,
            metaSchemas: scopedMetaSchemas
          }
        }
      },
      scopedSeedAdapters()
    );

    try {
      const res = await request.post(server.graphqlUrl, {
        headers: {
          'Content-Type': 'application/json',
          // The routing plane resolves the request by Host, not the TCP target.
          Host: 'app.test.constructive.io'
        },
        data: { query: '{ animals { nodes { name species } } }' }
      });

      expect(res.ok()).toBeTruthy();
      const json = await res.json();
      const names = json.data.animals.nodes.map((n: { name: string }) => n.name);
      expect(names).toEqual(
        expect.arrayContaining(['Buddy', 'Max', 'Whiskers', 'Mittens', 'Tweety'])
      );
    } finally {
      await teardown();
    }
  });
});
