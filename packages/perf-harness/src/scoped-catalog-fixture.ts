import { Pool, type PoolClient } from 'pg';

export const SCOPED_CATALOG_FIXTURE_VERSION = 1;
export const SCOPED_CATALOG_ROOT_TABLES = 65;

export type ScopedCatalogSize = 'small' | 'medium' | 'large';

export interface ScopedCatalogScale {
  size: ScopedCatalogSize;
  targetPgClassCount: number;
  noiseTableCount: number;
  noiseTypeAndFunctionCount: number;
}

export const SCOPED_CATALOG_SCALES: Record<
  ScopedCatalogSize,
  ScopedCatalogScale
> = {
  small: {
    size: 'small',
    targetPgClassCount: 650,
    noiseTableCount: 1,
    noiseTypeAndFunctionCount: 1,
  },
  medium: {
    size: 'medium',
    targetPgClassCount: 5_000,
    noiseTableCount: 1_100,
    noiseTypeAndFunctionCount: 110,
  },
  large: {
    size: 'large',
    targetPgClassCount: 60_000,
    noiseTableCount: 14_750,
    noiseTypeAndFunctionCount: 256,
  },
};

export interface ScopedCatalogLayout {
  fixture: string;
  rootSchema: string;
  dependencySchema: string;
  noiseSchema: string;
}

export interface CatalogEntityCounts {
  namespaces: number;
  classes: number;
  attributes: number;
  procedures: number;
  types: number;
  constraints: number;
  indexes: number;
  ranges: number;
  extensions: number;
}

export interface PreparedScopedCatalogFixture {
  fixtureVersion: number;
  fixture: string;
  size: ScopedCatalogSize;
  targetPgClassCount: number;
  database: string;
  serverVersion: string;
  schemas: ScopedCatalogLayout;
  rootTableCount: number;
  noiseTableCount: number;
  noiseTypeAndFunctionCount: number;
  catalogCounts: CatalogEntityCounts;
  fixtureCounts: CatalogEntityCounts;
}

export const validateScopedCatalogFixtureName = (fixture: string): string => {
  if (
    !/^cperf_[a-z0-9_]+$/.test(fixture) ||
    fixture.length > 52 ||
    fixture.includes('\0')
  ) {
    throw new Error(
      'scoped catalog fixture must start with cperf_, use lowercase letters, digits, and underscores, and be at most 52 characters'
    );
  }
  return fixture;
};

export const parseScopedCatalogSize = (value: string): ScopedCatalogSize => {
  if (value !== 'small' && value !== 'medium' && value !== 'large') {
    throw new Error("scoped catalog size must be 'small', 'medium', or 'large'");
  }
  return value;
};

export const makeScopedCatalogLayout = (
  fixture: string
): ScopedCatalogLayout => {
  const valid = validateScopedCatalogFixtureName(fixture);
  return {
    fixture: valid,
    rootSchema: `${valid}_root`,
    dependencySchema: `${valid}_dep`,
    noiseSchema: `${valid}_noise`,
  };
};

const quoteIdentifier = (identifier: string): string =>
  `"${identifier.replaceAll('"', '""')}"`;

const quoteLiteral = (value: string): string =>
  `'${value.replaceAll("'", "''")}'`;

const fixtureMarker = (size: ScopedCatalogSize): string =>
  `cperf scoped catalog fixture version ${SCOPED_CATALOG_FIXTURE_VERSION} size ${size}`;

const rootFixtureSql = (layout: ScopedCatalogLayout): string => {
  const root = quoteIdentifier(layout.rootSchema);
  const dependency = quoteIdentifier(layout.dependencySchema);
  const noise = quoteIdentifier(layout.noiseSchema);
  return `
    CREATE SCHEMA ${root};
    CREATE SCHEMA ${dependency};
    CREATE SCHEMA ${noise};

    CREATE TYPE ${dependency}."entity_status" AS ENUM ('draft', 'active', 'archived');
    CREATE DOMAIN ${dependency}."positive_integer" AS integer CHECK (VALUE > 0);
    CREATE TYPE ${dependency}."entity_payload" AS (
      status ${dependency}."entity_status",
      score ${dependency}."positive_integer"
    );
    CREATE TABLE ${dependency}."owners" (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      status ${dependency}."entity_status" NOT NULL
    );
    CREATE TABLE ${dependency}."inherited_base" (
      inherited_status ${dependency}."entity_status" NOT NULL
    );

    DO $fixture$
    DECLARE
      item integer;
      table_name text;
    BEGIN
      FOR item IN 1..${SCOPED_CATALOG_ROOT_TABLES} LOOP
        table_name := 'entity_' || lpad(item::text, 5, '0');
        EXECUTE format(
          'CREATE TABLE %I.%I (
            id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            owner_id bigint NOT NULL REFERENCES %I.owners(id),
            status %I.entity_status NOT NULL,
            score %I.positive_integer NOT NULL,
            payload %I.entity_payload,
            title text NOT NULL
          )',
          ${quoteLiteral(layout.rootSchema)}, table_name,
          ${quoteLiteral(layout.dependencySchema)},
          ${quoteLiteral(layout.dependencySchema)},
          ${quoteLiteral(layout.dependencySchema)},
          ${quoteLiteral(layout.dependencySchema)}
        );
        EXECUTE format(
          'CREATE INDEX %I ON %I.%I (owner_id, status)',
          table_name || '_owner_status_idx',
          ${quoteLiteral(layout.rootSchema)}, table_name
        );
        EXECUTE format(
          'CREATE FUNCTION %I.%I(requested_status %I.entity_status)
           RETURNS SETOF %I.%I LANGUAGE sql STABLE AS %L',
          ${quoteLiteral(layout.rootSchema)}, table_name || '_by_status',
          ${quoteLiteral(layout.dependencySchema)},
          ${quoteLiteral(layout.rootSchema)}, table_name,
          format('SELECT * FROM %I.%I WHERE status = requested_status',
            ${quoteLiteral(layout.rootSchema)}, table_name)
        );
      END LOOP;
    END
    $fixture$;

    CREATE TABLE ${root}."inherited_items" (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY
    ) INHERITS (${dependency}."inherited_base");
    CREATE TABLE ${root}."inheritance_root" (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      root_note text NOT NULL
    );
    CREATE TABLE ${noise}."reverse_inherited_item" (
      noise_note text NOT NULL
    ) INHERITS (${root}."inheritance_root");
  `;
};

const noiseTablesSql = (
  layout: ScopedCatalogLayout,
  firstTable: number,
  lastTable: number
): string => `
  DO $noise$
  DECLARE
    item integer;
    sequence_name text;
    table_name text;
    type_name text;
  BEGIN
    FOR item IN ${firstTable}..${lastTable} LOOP
      sequence_name := 'noise_sequence_' || lpad(item::text, 5, '0');
      table_name := 'noise_table_' || lpad(item::text, 5, '0');
      EXECUTE format('CREATE SEQUENCE %I.%I',
        ${quoteLiteral(layout.noiseSchema)}, sequence_name);
      EXECUTE format(
        'CREATE TABLE %I.%I (
          id bigint PRIMARY KEY DEFAULT nextval(%L::regclass),
          noise_value integer NOT NULL
        )',
        ${quoteLiteral(layout.noiseSchema)}, table_name,
        ${quoteLiteral(`${layout.noiseSchema}.`)} || quote_ident(sequence_name)
      );
      EXECUTE format('ALTER SEQUENCE %I.%I OWNED BY %I.%I.id',
        ${quoteLiteral(layout.noiseSchema)}, sequence_name,
        ${quoteLiteral(layout.noiseSchema)}, table_name);
      EXECUTE format('CREATE INDEX %I ON %I.%I (noise_value)',
        table_name || '_value_idx',
        ${quoteLiteral(layout.noiseSchema)}, table_name);
    END LOOP;
  END
  $noise$;
`;

const noiseTypesAndFunctionsSql = (
  layout: ScopedCatalogLayout,
  count: number
): string => `
  DO $noise_types$
  DECLARE
    item integer;
    type_name text;
  BEGIN
    FOR item IN 1..${count} LOOP
      type_name := 'noise_type_' || lpad(item::text, 5, '0');
      EXECUTE format('CREATE TYPE %I.%I AS ENUM (%L, %L)',
        ${quoteLiteral(layout.noiseSchema)}, type_name, 'one', 'two');
      EXECUTE format(
        'CREATE FUNCTION %I.%I(input_value %I.%I)
         RETURNS %I.%I LANGUAGE sql IMMUTABLE AS %L',
        ${quoteLiteral(layout.noiseSchema)}, 'noise_function_' || lpad(item::text, 5, '0'),
        ${quoteLiteral(layout.noiseSchema)}, type_name,
        ${quoteLiteral(layout.noiseSchema)}, type_name,
        'SELECT input_value'
      );
    END LOOP;
  END
  $noise_types$;
`;

const countRow = async (
  client: PoolClient,
  schemas?: readonly string[]
): Promise<CatalogEntityCounts> => {
  const filter = schemas
    ? 'WHERE pg_namespace.nspname = ANY($1::text[])'
    : '';
  const values = schemas ? [schemas] : [];
  const result = await client.query<CatalogEntityCounts>(
    `
      SELECT
        (SELECT count(*)::integer FROM pg_catalog.pg_namespace
          ${schemas ? 'WHERE nspname = ANY($1::text[])' : ''}) AS namespaces,
        (SELECT count(*)::integer FROM pg_catalog.pg_class
          INNER JOIN pg_catalog.pg_namespace ON pg_namespace.oid = pg_class.relnamespace
          ${filter}) AS classes,
        (SELECT count(*)::integer FROM pg_catalog.pg_attribute
          INNER JOIN pg_catalog.pg_class ON pg_class.oid = pg_attribute.attrelid
          INNER JOIN pg_catalog.pg_namespace ON pg_namespace.oid = pg_class.relnamespace
          ${filter} ${schemas ? 'AND' : 'WHERE'} pg_attribute.attnum > 0) AS attributes,
        (SELECT count(*)::integer FROM pg_catalog.pg_proc
          INNER JOIN pg_catalog.pg_namespace ON pg_namespace.oid = pg_proc.pronamespace
          ${filter}) AS procedures,
        (SELECT count(*)::integer FROM pg_catalog.pg_type
          INNER JOIN pg_catalog.pg_namespace ON pg_namespace.oid = pg_type.typnamespace
          ${filter}) AS types,
        (SELECT count(*)::integer FROM pg_catalog.pg_constraint
          INNER JOIN pg_catalog.pg_namespace ON pg_namespace.oid = pg_constraint.connamespace
          ${filter}) AS constraints,
        (SELECT count(*)::integer FROM pg_catalog.pg_index
          INNER JOIN pg_catalog.pg_class ON pg_class.oid = pg_index.indexrelid
          INNER JOIN pg_catalog.pg_namespace ON pg_namespace.oid = pg_class.relnamespace
          ${filter}) AS indexes,
        (SELECT count(*)::integer FROM pg_catalog.pg_range
          INNER JOIN pg_catalog.pg_type ON pg_type.oid = pg_range.rngtypid
          INNER JOIN pg_catalog.pg_namespace ON pg_namespace.oid = pg_type.typnamespace
          ${filter}) AS ranges,
        (SELECT count(*)::integer FROM pg_catalog.pg_extension
          INNER JOIN pg_catalog.pg_namespace ON pg_namespace.oid = pg_extension.extnamespace
          ${filter}) AS extensions
    `,
    values
  );
  const row = result.rows[0];
  if (!row) throw new Error('could not inspect PostgreSQL catalog counts');
  return row;
};

const inspectWithClient = async (
  client: PoolClient,
  layout: ScopedCatalogLayout,
  size: ScopedCatalogSize
): Promise<PreparedScopedCatalogFixture> => {
  const schemaNames = [
    layout.rootSchema,
    layout.dependencySchema,
    layout.noiseSchema,
  ];
  const identity = await client.query<{
    database: string;
    server_version: string;
    marker: string | null;
  }>(
    `
      SELECT
        current_database() AS database,
        current_setting('server_version') AS server_version,
        pg_catalog.obj_description(pg_namespace.oid, 'pg_namespace') AS marker
      FROM pg_catalog.pg_namespace
      WHERE nspname = $1
    `,
    [layout.rootSchema]
  );
  const row = identity.rows[0];
  if (!row || row.marker !== fixtureMarker(size)) {
    throw new Error(
      `fixture '${layout.fixture}' is absent or does not match size '${size}' and fixture version ${SCOPED_CATALOG_FIXTURE_VERSION}`
    );
  }
  return {
    fixtureVersion: SCOPED_CATALOG_FIXTURE_VERSION,
    fixture: layout.fixture,
    size,
    targetPgClassCount: SCOPED_CATALOG_SCALES[size].targetPgClassCount,
    database: row.database,
    serverVersion: row.server_version,
    schemas: layout,
    rootTableCount: SCOPED_CATALOG_ROOT_TABLES + 2,
    noiseTableCount: SCOPED_CATALOG_SCALES[size].noiseTableCount + 1,
    noiseTypeAndFunctionCount:
      SCOPED_CATALOG_SCALES[size].noiseTypeAndFunctionCount,
    catalogCounts: await countRow(client),
    fixtureCounts: await countRow(client, schemaNames),
  };
};

export const inspectScopedCatalogFixture = async (options: {
  databaseUrl: string;
  fixture: string;
  size: ScopedCatalogSize;
}): Promise<PreparedScopedCatalogFixture> => {
  const layout = makeScopedCatalogLayout(options.fixture);
  const pool = new Pool({ connectionString: options.databaseUrl, max: 1 });
  const client = await pool.connect();
  try {
    return await inspectWithClient(client, layout, options.size);
  } finally {
    client.release();
    await pool.end();
  }
};

export const prepareScopedCatalogFixture = async (options: {
  databaseUrl: string;
  fixture: string;
  size: ScopedCatalogSize;
}): Promise<PreparedScopedCatalogFixture> => {
  const layout = makeScopedCatalogLayout(options.fixture);
  const scale = SCOPED_CATALOG_SCALES[options.size];
  const pool = new Pool({ connectionString: options.databaseUrl, max: 1 });
  const client = await pool.connect();
  try {
    await client.query('begin');
    const existing = await client.query<{ nspname: string }>(
      `SELECT nspname FROM pg_catalog.pg_namespace WHERE nspname = ANY($1::text[])`,
      [[layout.rootSchema, layout.dependencySchema, layout.noiseSchema]]
    );
    if (existing.rows.length > 0) {
      throw new Error(
        `fixture '${layout.fixture}' cannot be prepared because schema '${existing.rows[0].nspname}' already exists; this command never replaces or drops schemas`
      );
    }
    await client.query(rootFixtureSql(layout));
    await client.query('commit');
    const noiseBatchSize = 250;
    for (
      let firstTable = 1;
      firstTable <= scale.noiseTableCount;
      firstTable += noiseBatchSize
    ) {
      const lastTable = Math.min(
        scale.noiseTableCount,
        firstTable + noiseBatchSize - 1
      );
      await client.query('begin');
      await client.query(noiseTablesSql(layout, firstTable, lastTable));
      await client.query('commit');
    }
    await client.query('begin');
    await client.query(
      noiseTypesAndFunctionsSql(layout, scale.noiseTypeAndFunctionCount)
    );
    for (const schema of [
      layout.rootSchema,
      layout.dependencySchema,
      layout.noiseSchema,
    ]) {
      await client.query(
        `COMMENT ON SCHEMA ${quoteIdentifier(schema)} IS ${quoteLiteral(fixtureMarker(options.size))}`
      );
    }
    await client.query('commit');
    return await inspectWithClient(client, layout, options.size);
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {
      // Preserve the preparation error; the client is discarded below.
    }
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};
