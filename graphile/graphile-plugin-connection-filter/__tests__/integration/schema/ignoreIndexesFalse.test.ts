import '../../../test-utils/env';
import { join } from 'path';
import type { GraphileConfig } from 'graphile-config';
import { Pool } from 'pg';
import { makeSchema } from 'graphile-build';
import { defaultPreset as graphileBuildDefaultPreset } from 'graphile-build';
import { defaultPreset as graphileBuildPgDefaultPreset } from 'graphile-build-pg';
import { makePgService } from 'postgraphile/adaptors/pg';
import { getConnections, seed } from 'pgsql-test';
import type { PgTestClient } from 'pgsql-test/test-client';

import { PostGraphileConnectionFilterPreset } from '../../../src/index';
import { printSchemaOrdered } from '../../../test-utils/printSchema';

const SCHEMA = process.env.SCHEMA ?? 'p';
const sql = (file: string) => join(__dirname, '../../../sql', file);

let db!: PgTestClient;
let teardown!: () => Promise<void>;
let pool!: Pool;

/**
 * Base preset for schema tests - combines graphile-build defaults with
 * connection filter plugin, disabling Node/Relay and mutations.
 */
const BaseTestPreset: GraphileConfig.Preset = {
  extends: [
    graphileBuildDefaultPreset,
    graphileBuildPgDefaultPreset,
    PostGraphileConnectionFilterPreset,
  ],
  disablePlugins: [
    'NodePlugin',
    'PgConditionArgumentPlugin',
    'PgMutationCreatePlugin',
    'PgMutationUpdateDeletePlugin',
  ],
};

const createSchemaSnapshot = async (
  schemaOptions?: GraphileBuild.SchemaOptions
): Promise<string> => {
  const preset: GraphileConfig.Preset = {
    extends: [BaseTestPreset],
    ...(schemaOptions && { schema: schemaOptions }),
    pgServices: [
      makePgService({
        pool,
        schemas: [SCHEMA],
      }),
    ],
  };
  const { schema } = await makeSchema(preset);
  return printSchemaOrdered(schema);
};

beforeAll(async () => {
  const connections = await getConnections({}, [
    seed.sqlfile([sql('schema.sql')]),
  ]);
  ({ pg: db, teardown } = connections);
  pool = new Pool(db.config);
});

beforeEach(() => db.beforeEach());
beforeEach(() => db.setContext({ role: 'authenticated' }));
afterEach(() => db.afterEach());
afterAll(async () => {
  await pool.end();
  await teardown();
});

it(
  'prints a schema with the filter plugin and the `ignoreIndexes: false` option',
  async () => {
    // In v5, ignoreIndexes is not a standard option - indexes are handled differently.
    // We test with computed columns and setof functions disabled to match v4 behavior.
    const schema = await createSchemaSnapshot({
      connectionFilterComputedColumns: false,
      connectionFilterSetofFunctions: false,
    });

    expect(schema).toMatchSnapshot();
  }
);
