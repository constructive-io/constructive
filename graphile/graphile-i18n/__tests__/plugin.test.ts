import '../test-utils/env';

import type { GraphQLQueryFn } from 'graphile-test';
import { getConnections, snapshot } from 'graphile-test';
import { join } from 'path';
import { seed } from 'pgsql-test';
import type { PgTestClient } from 'pgsql-test/test-client';

import LangPlugin, { additionalGraphQLContextFromRequest } from '../src';
import { GetProjectsAndLanguages } from '../test-utils/queries';

const SCHEMA = process.env.SCHEMA ?? 'app_public';
const sql = (f: string) => join(__dirname, '../sql', f);

let teardown: () => Promise<void>;
let query: GraphQLQueryFn;
let db: PgTestClient;

beforeAll(async () => {
  const connections = await getConnections(
    {
      schemas: [SCHEMA],
      authRole: 'authenticated',
      graphile: {
        overrideSettings: {
          appendPlugins: [LangPlugin],
          graphileBuildOptions: {
            langPluginLanguageCodeGqlField: 'langCode',
            langPluginLanguageCodeColumn: 'lang_code',
            langPluginAllowedTypes: ['citext', 'text'],
            langPluginDefaultLanguages: ['en']
          },
          additionalGraphQLContextFromRequest
        }
      }
    },
    [
      seed.sqlfile([sql('test.sql')])
    ]
  );

  ({ db, query, teardown } = connections);
});

beforeEach(() => db.beforeEach());
beforeEach(async () => {
  db.setContext({
    role: 'authenticated'
  });
});
afterEach(() => db.afterEach());
afterAll(async () => {
  await teardown();
});

it('exposes localized strings', async () => {
  const data = await query(GetProjectsAndLanguages, undefined, undefined, {
    headers: {
      'accept-language': 'es'
    }
  });

  expect(snapshot(data)).toMatchSnapshot();
});
