import { randomUUID } from 'crypto';

import { QuoteUtils } from '@pgsql/quotes';
import { execute } from 'grafast';
import { makeSchema } from 'graphile-build';
import { withPgClientFromPgService } from 'graphile-build-pg';
import type { GraphileConfig } from 'graphile-config';
import { parse, type ExecutionResult } from 'graphql';
import { Pool } from 'pg';

import { resolveIntrospectionSettings } from '../src/introspection-settings';
import { ConstructivePreset } from '../src/presets/constructive-preset';

const { makePgService: makePostGraphilePgService } = require('postgraphile/adaptors/pg') as {
  makePgService(options: Record<string, unknown>): any;
};

jest.setTimeout(120000);

const API_SCHEMA = 'tenant_api';

function makePgService(
  options: Record<string, unknown> & {
    introspectionMode: 'stock' | 'scoped-required';
  }
) {
  const pgSettingsForIntrospection = resolveIntrospectionSettings(
    options.introspectionMode,
    options.pgSettingsForIntrospection as Record<string, string> | undefined
  );
  return Object.assign(makePostGraphilePgService({
    ...options,
    pgSettingsForIntrospection
  }), {
    introspectionMode: options.introspectionMode,
    introspectionAllowedDependencySchemas: options.introspectionAllowedDependencySchemas,
    introspectionCapabilityExtensions: options.introspectionCapabilityExtensions
  });
}

interface FixtureSpec {
  database: string;
  role: string;
  unrelatedAclRole: string;
  password: string;
  index: string;
  token: string;
}

interface DocumentsResult {
  documents: {
    nodes: Array<{
      body: string;
      bodyBm25Score: number | null;
    }>;
  };
}

interface BuiltApi {
  pool: Pool;
  query: (term: string) => Promise<ExecutionResult<DocumentsResult>>;
}

async function readPlannerSettings(pool: Pool) {
  return (await pool.query<{
    pid: number;
    jit: string;
    work_mem: string;
  }>(`
    SELECT
      pg_backend_pid() AS pid,
      current_setting('jit') AS jit,
      current_setting('work_mem') AS work_mem
  `)).rows[0];
}

function fixtureSpec(label: 'a' | 'b', token: string): FixtureSpec {
  const suffix = randomUUID().replace(/-/g, '').slice(0, 10);
  return {
    database: `gsi_bm25_${label}_${suffix}`,
    role: `gsi_bm25_${label}_role_${suffix}`,
    unrelatedAclRole: `gsi_bm25_${label}_auditor_${suffix}`,
    password: `gsi_${suffix}_${label}_local_only`,
    index: `${label}_opaque_lexicon_${suffix}`,
    token
  };
}

async function provisionFixture(
  adminPool: Pool,
  spec: FixtureSpec,
  createdDatabases: string[],
  createdRoles: string[]
): Promise<void> {
  const database = QuoteUtils.quoteIdentifier(spec.database);
  const role = QuoteUtils.quoteIdentifier(spec.role);
  const unrelatedAclRole = QuoteUtils.quoteIdentifier(spec.unrelatedAclRole);

  await adminPool.query(
    `CREATE ROLE ${role}
       LOGIN PASSWORD ${QuoteUtils.escape(spec.password)}
       NOSUPERUSER NOBYPASSRLS NOCREATEROLE NOCREATEDB NOREPLICATION NOINHERIT`
  );
  createdRoles.push(spec.role);

  await adminPool.query(
    `CREATE ROLE ${unrelatedAclRole}
       NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEROLE NOCREATEDB NOREPLICATION NOINHERIT`
  );
  createdRoles.push(spec.unrelatedAclRole);

  await adminPool.query(`CREATE DATABASE ${database}`);
  createdDatabases.push(spec.database);
  await adminPool.query(`REVOKE CONNECT ON DATABASE ${database} FROM PUBLIC`);
  await adminPool.query(`GRANT CONNECT ON DATABASE ${database} TO ${role}`);

  const ownerPool = new Pool({ database: spec.database });
  try {
    await ownerPool.query('CREATE EXTENSION pg_textsearch');
    await ownerPool.query(`CREATE SCHEMA ${API_SCHEMA}`);
    await ownerPool.query(`REVOKE ALL ON SCHEMA ${API_SCHEMA} FROM PUBLIC`);
    await ownerPool.query(`
      CREATE TABLE ${API_SCHEMA}.documents (
        id integer PRIMARY KEY,
        body text NOT NULL
      )
    `);
    await ownerPool.query(`
      INSERT INTO ${API_SCHEMA}.documents (id, body)
      VALUES (1, $1)
    `, [spec.token]);
    await ownerPool.query(`
      CREATE INDEX ${QuoteUtils.quoteIdentifier(spec.index)}
        ON ${API_SCHEMA}.documents USING bm25(body)
        WITH (text_config = 'english')
    `);
    await ownerPool.query(`GRANT USAGE ON SCHEMA ${API_SCHEMA} TO ${role}`);
    await ownerPool.query(`GRANT SELECT ON ${API_SCHEMA}.documents TO ${role}`);
    // PgRBACPlugin resolves every retained ACL entry, even when the grantee is
    // unrelated to the runtime login. Scoped introspection must retain this role.
    await ownerPool.query(
      `GRANT SELECT ON ${API_SCHEMA}.documents TO ${unrelatedAclRole}`
    );
  } finally {
    await ownerPool.end();
  }
}

async function assertLeastPrivilege(pool: Pool, spec: FixtureSpec): Promise<void> {
  const result = await pool.query<{
    rolname: string;
    rolsuper: boolean;
    rolbypassrls: boolean;
    rolcreaterole: boolean;
    rolcreatedb: boolean;
    rolreplication: boolean;
    rolinherit: boolean;
    owns_database: boolean;
    owns_schema: boolean;
    can_create_in_schema: boolean;
  }>(`
    SELECT
      role.rolname,
      role.rolsuper,
      role.rolbypassrls,
      role.rolcreaterole,
      role.rolcreatedb,
      role.rolreplication,
      role.rolinherit,
      database.datdba = role.oid AS owns_database,
      namespace.nspowner = role.oid AS owns_schema,
      pg_catalog.has_schema_privilege(
        role.oid,
        namespace.oid,
        'CREATE'
      ) AS can_create_in_schema
    FROM pg_catalog.pg_roles AS role
    JOIN pg_catalog.pg_database AS database
      ON database.datname = current_database()
    JOIN pg_catalog.pg_namespace AS namespace
      ON namespace.nspname = $1
    WHERE role.rolname = current_user
  `, [API_SCHEMA]);

  expect(result.rows).toEqual([{
    rolname: spec.role,
    rolsuper: false,
    rolbypassrls: false,
    rolcreaterole: false,
    rolcreatedb: false,
    rolreplication: false,
    rolinherit: false,
    owns_database: false,
    owns_schema: false,
    can_create_in_schema: false
  }]);
}

async function expectUnapprovedExtensionSchemaRejected(spec: FixtureSpec): Promise<void> {
  const pool = new Pool({
    database: spec.database,
    user: spec.role,
    password: spec.password,
    max: 1
  });
  try {
    const settingsBefore = await readPlannerSettings(pool);
    const pgService = makePgService({
      pool,
      schemas: [API_SCHEMA],
      introspectionMode: 'scoped-required',
      // Naming a capability controls retained extension metadata; it must not
      // silently approve the extension's physical schema.
      introspectionCapabilityExtensions: ['pg_textsearch']
    });
    await expect(makeSchema({
      extends: [ConstructivePreset],
      pgServices: [pgService]
    })).rejects.toThrow('crossed into unapproved dependency schema(s): public');
    expect(await readPlannerSettings(pool)).toEqual(settingsBefore);
  } finally {
    await pool.end();
  }
}

async function buildApi(spec: FixtureSpec): Promise<BuiltApi> {
  const pool = new Pool({
    database: spec.database,
    user: spec.role,
    password: spec.password,
    max: 1
  });

  try {
    await assertLeastPrivilege(pool, spec);
    const settingsBefore = await readPlannerSettings(pool);

    const pgService = makePgService({
      pool,
      schemas: [API_SCHEMA],
      introspectionMode: 'scoped-required',
      introspectionAllowedDependencySchemas: ['public'],
      introspectionCapabilityExtensions: ['pg_textsearch']
    });
    const preset: GraphileConfig.Preset = {
      // Deliberately reuse the module-level preset, including its plugin objects.
      extends: [ConstructivePreset],
      pgServices: [pgService]
    };
    const { schema, resolvedPreset } = await makeSchema(preset);
    expect(await readPlannerSettings(pool)).toEqual(settingsBefore);
    const withPgClientKey = pgService.withPgClientKey ?? 'withPgClient';

    return {
      pool,
      async query(term: string) {
        const result = await execute({
          schema,
          document: parse(`
            query ScopedBm25Isolation($term: String!) {
              documents(where: { bm25Body: { query: $term } }) {
                nodes {
                  body
                  bodyBm25Score
                }
              }
            }
          `),
          variableValues: { term },
          contextValue: {
            pgSettings: {},
            [withPgClientKey]: withPgClientFromPgService.bind(null, pgService)
          },
          resolvedPreset
        });
        if (Symbol.asyncIterator in result) {
          throw new Error('BM25 isolation query unexpectedly returned a stream');
        }
        return result as unknown as ExecutionResult<DocumentsResult>;
      }
    };
  } catch (error) {
    await pool.end();
    throw error;
  }
}

async function expectDatabaseConnectionDenied(
  source: FixtureSpec,
  target: FixtureSpec
): Promise<void> {
  const crossTenantPool = new Pool({
    database: target.database,
    user: source.role,
    password: source.password,
    max: 1
  });
  try {
    await expect(crossTenantPool.query('SELECT 1')).rejects.toMatchObject({
      code: '42501'
    });
  } finally {
    await crossTenantPool.end();
  }
}

describe('scoped BM25 cross-database isolation', () => {
  it('keeps same-named tenant APIs bound to their own database and BM25 index', async () => {
    const adminPool = new Pool({ database: 'postgres', max: 1 });
    const createdDatabases: string[] = [];
    const createdRoles: string[] = [];
    const builtApis: BuiltApi[] = [];
    const tenantA = fixtureSpec('a', 'amber lunar archive tenant-a-only');
    const tenantB = fixtureSpec('b', 'violet orchard ledger tenant-b-only');

    try {
      await provisionFixture(adminPool, tenantA, createdDatabases, createdRoles);
      await provisionFixture(adminPool, tenantB, createdDatabases, createdRoles);

      await expectDatabaseConnectionDenied(tenantA, tenantB);
      await expectDatabaseConnectionDenied(tenantB, tenantA);
      await expectUnapprovedExtensionSchemaRejected(tenantA);

      // Build sequentially so the second build exercises reuse of the exact same
      // long-lived ConstructivePreset and its UnifiedSearchPlugin instance.
      const apiA = await buildApi(tenantA);
      builtApis.push(apiA);
      const apiB = await buildApi(tenantB);
      builtApis.push(apiB);

      const [resultA, resultB] = await Promise.all([
        apiA.query('lunar'),
        apiB.query('orchard')
      ]);

      expect(resultA.errors).toBeUndefined();
      expect(resultB.errors).toBeUndefined();
      expect(resultA.data?.documents.nodes).toEqual([{
        body: tenantA.token,
        bodyBm25Score: expect.any(Number)
      }]);
      expect(resultB.data?.documents.nodes).toEqual([{
        body: tenantB.token,
        bodyBm25Score: expect.any(Number)
      }]);
    } finally {
      await Promise.allSettled(builtApis.map(({ pool }) => pool.end()));

      for (const databaseName of [...createdDatabases].reverse()) {
        await adminPool.query(
          `DROP DATABASE IF EXISTS ${QuoteUtils.quoteIdentifier(databaseName)} WITH (FORCE)`
        );
      }
      for (const roleName of [...createdRoles].reverse()) {
        await adminPool.query(
          `DROP ROLE IF EXISTS ${QuoteUtils.quoteIdentifier(roleName)}`
        );
      }
      await adminPool.end();
    }
  });
});
