import { Pool } from 'pg';

export const FIXTURE_VERSION = 1;

export interface PrepareFixtureOptions {
  databaseUrl: string;
  schema: string;
  tables: number;
}

export interface PreparedFixture {
  fixtureVersion: number;
  database: string;
  serverVersion: string;
  schema: string;
  tableCount: number;
  functionCount: number;
}

export const validateFixtureSchema = (schema: string): string => {
  if (
    !/^cperf_[a-z0-9_]*$/.test(schema) ||
    schema.length > 63 ||
    schema.includes('\0')
  ) {
    throw new Error(
      'fixture schema must start with cperf_, use only lowercase letters, digits, and underscores, and fit PostgreSQL identifiers'
    );
  }
  return schema;
};

export const validateFixtureTableCount = (tables: number): number => {
  if (!Number.isSafeInteger(tables) || tables < 1 || tables > 500) {
    throw new Error('fixture table count must be an integer between 1 and 500');
  }
  return tables;
};

const quoteIdentifier = (identifier: string): string =>
  `"${identifier.replaceAll('"', '""')}"`;

export const prepareFixture = async (
  options: PrepareFixtureOptions
): Promise<PreparedFixture> => {
  const schema = validateFixtureSchema(options.schema);
  const tables = validateFixtureTableCount(options.tables);
  const quotedSchema = quoteIdentifier(schema);
  const pool = new Pool({ connectionString: options.databaseUrl, max: 1 });
  const client = await pool.connect();
  try {
    await client.query('begin');
    const existing = await client.query<{ exists: boolean }>(
      'select exists(select 1 from pg_catalog.pg_namespace where nspname = $1) as exists',
      [schema]
    );
    if (existing.rows[0]?.exists) {
      throw new Error(
        `fixture schema '${schema}' already exists; this command never replaces schemas`
      );
    }
    await client.query(`create schema ${quotedSchema}`);
    await client.query(
      `comment on schema ${quotedSchema} is 'cperf fixture version ${FIXTURE_VERSION}'`
    );
    await client.query(
      `create type ${quotedSchema}."entity_status" as enum ('draft', 'active', 'archived')`
    );
    await client.query(`
      create table ${quotedSchema}."account" (
        id bigint generated always as identity primary key,
        external_id uuid not null unique,
        name text not null,
        metadata jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now()
      )
    `);
    for (let index = 1; index <= tables; index += 1) {
      const table = quoteIdentifier(`entity_${index}`);
      const functionName = quoteIdentifier(`entity_${index}_by_account`);
      const indexName = quoteIdentifier(`entity_${index}_account_created_idx`);
      await client.query(`
        create table ${quotedSchema}.${table} (
          id bigint generated always as identity primary key,
          account_id bigint not null references ${quotedSchema}."account"(id),
          status ${quotedSchema}."entity_status" not null default 'draft',
          title text not null,
          tags text[] not null default array[]::text[],
          metadata jsonb not null default '{}'::jsonb,
          created_at timestamptz not null default now(),
          unique (account_id, title)
        );
        create index ${indexName}
          on ${quotedSchema}.${table} (account_id, created_at desc);
        create function ${quotedSchema}.${functionName}(requested_account_id bigint)
          returns setof ${quotedSchema}.${table}
          language sql stable
          as 'select * from ${quotedSchema}.${table} where account_id = requested_account_id';
      `);
    }
    const identity = await client.query<{
      database: string;
      server_version: string;
    }>(
      "select current_database() as database, current_setting('server_version') as server_version"
    );
    await client.query('commit');
    return {
      fixtureVersion: FIXTURE_VERSION,
      database: identity.rows[0].database,
      serverVersion: identity.rows[0].server_version,
      schema,
      tableCount: tables + 1,
      functionCount: tables,
    };
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {
      // Preserve the fixture preparation error; the client is discarded below.
    }
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};
