import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { execute } from 'grafast';
import { makeSchema } from 'graphile-build';
import { withPgClientFromPgService } from 'graphile-build-pg';
import type { GraphileConfig } from 'graphile-config';
import {
  type ExecutionResult,
  type GraphQLSchema,
  isObjectType,
  lexicographicSortSchema,
  parse,
  printSchema
} from 'graphql';
import type { Pool } from 'pg';

import { resolveIntrospectionSettings } from '../src/introspection-settings';
import { createConstructivePreset } from '../src/presets/constructive-preset';

jest.setTimeout(180000);

const API_SCHEMA = 'closure_api';
const PLAIN_API_SCHEMA = 'closure_plain_api';
const EXTENSION_SCHEMA = 'closure_ext';
const FIXTURE = join(
  __dirname,
  '../sql/scoped-introspection-capability-closure.sql'
);
const REQUIRED_EXTENSIONS = [
  'ltree',
  'pg_textsearch',
  'pg_trgm',
  'postgis',
  'vector'
] as const;
const REQUIRED_INDEXES = [
  'closure_records_body_bm25_idx',
  'closure_records_embedding_idx',
  'closure_records_geom_idx',
  'closure_records_name_trgm_idx',
  'closure_records_path_idx',
  'closure_records_pkey',
  'closure_records_score_window_idx',
  'closure_records_search_document_idx'
] as const;
const REQUIRED_RECORD_FIELDS = [
  'id',
  'name',
  'body',
  'status',
  'statuses',
  'label',
  'labels',
  'payload',
  'payloads',
  'scoreWindow',
  'scoreWindowArray',
  'scoreWindows',
  'searchDocument',
  'path',
  'paths',
  'embedding',
  'embeddings',
  'geom',
  'geoms'
] as const;
const MAX_SERVICE_CATALOG_ROWS = 128;

const CORE_DOCUMENT = parse(`
  query ClosureCoreTypes {
    closureRecords {
      nodes {
        id
        name
        status
        statuses
        label
        labels
        payload { label weight }
        payloads { label weight }
        scoreWindow {
          start { value inclusive }
          end { value inclusive }
        }
        scoreWindowArray {
          start { value inclusive }
          end { value inclusive }
        }
        scoreWindows {
          start { value inclusive }
          end { value inclusive }
        }
        path
        paths
        embedding
        embeddings
        geom { geojson }
      }
    }
    closureFunctionProbe {
      nodes { id name }
    }
    closureMultirangeProbe(
      expected: [
        {
          start: { value: "40", inclusive: true }
          end: { value: "50", inclusive: false }
        }
        {
          start: { value: "60", inclusive: true }
          end: { value: "70", inclusive: true }
        }
      ]
    ) {
      start { value inclusive }
      end { value inclusive }
    }
    closureTimestampMultirangeProbe(
      expected: [
        {
          start: { value: "2026-08-01T00:00:00Z", inclusive: true }
          end: { value: "2026-08-02T00:00:00Z", inclusive: false }
        }
        {
          start: { value: "2026-08-03T00:00:00Z", inclusive: true }
          end: { value: "2026-08-04T00:00:00Z", inclusive: true }
        }
      ]
    ) {
      start { value inclusive }
      end { value inclusive }
    }
  }
`);

const EXTENSION_DOCUMENT = parse(`
  query ClosureExtensionCapabilities($bbox: GeoJSON!) {
    tsvector: closureRecords(
      where: { tsvSearchDocument: "tenant" }
    ) {
      nodes { id searchDocumentTsvRank }
    }
    trigram: closureRecords(
      where: { trgmName: { value: "Acme", threshold: 0.1 } }
    ) {
      nodes { id nameTrgmSimilarity }
    }
    bm25: closureRecords(
      where: { bm25Body: { query: "tenant" } }
    ) {
      nodes { id bodyBm25Score }
    }
    vector: closureRecords(
      where: {
        vectorEmbedding: {
          nearby: { embedding: [1, 0, 0], distance: 0.1 }
        }
      }
    ) {
      nodes { id embeddingVectorDistance }
    }
    postgis: closureRecords(
      where: { geom: { intersects: $bbox } }
    ) {
      nodes { id }
    }
    ltree: closureRecords(
      where: { path: { within: "/customers" } }
    ) {
      nodes { id path }
    }
  }
`);

const PLAIN_EXTENSION_DOCUMENT = parse(`
  query InstalledExtensionWithoutObjectDependency {
    plainRecords(
      where: { trgmBody: { value: "tenant", threshold: 0.1 } }
    ) {
      nodes { id body bodyTrgmSimilarity }
    }
  }
`);

const BBOX = {
  type: 'Polygon',
  coordinates: [[
    [-74.1, 40.6],
    [-73.9, 40.6],
    [-73.9, 40.9],
    [-74.1, 40.9],
    [-74.1, 40.6]
  ]],
  crs: {
    type: 'name',
    properties: { name: 'EPSG:4326' }
  }
};

type PgTestClientLike = {
  config: Record<string, unknown>;
  query: <T = unknown>(text: string, values?: unknown[]) => Promise<{
    rows: T[];
  }>;
  beforeEach: () => Promise<void>;
  afterEach: () => Promise<void>;
};

type ConnectionResult = {
  pg: PgTestClientLike;
  manager: { getPool: (config: Record<string, unknown>) => Pool };
  teardown: () => Promise<void>;
};

type RawIntrospection = {
  namespaces: Array<{ _id: string; nspname: string }>;
  classes: Array<{ _id: string; relname: string }>;
  types: Array<{
    _id: string;
    typname: string;
    typnamespace: string;
    typtype: string;
    typelem: string;
    typarray: string;
  }>;
  extensions: Array<{ extname: string }>;
  languages: Array<{ lanname: string }>;
  am: Array<{ amname: string }>;
  indexes: Array<{ indexrelid: string }>;
};

type BuiltSchema = Awaited<ReturnType<typeof makeSchema>> & {
  pgService: ReturnType<typeof makePgService>;
  schemaName: string;
};

const { makePgService: makePostGraphilePgService } = require(
  'postgraphile/adaptors/pg'
) as {
  makePgService: (
    options: Record<string, unknown>
  ) => GraphileConfig.PgServiceConfiguration;
};

function makePgService(options: {
  pool: Pool;
  schemas: readonly string[];
  introspectionMode: 'stock' | 'scoped-required';
  introspectionScopedCatalogTypes?: 'dependency-closure';
  introspectionAllowedDependencySchemas?: readonly string[];
  introspectionCapabilityExtensions?: readonly string[];
}) {
  const pgSettingsForIntrospection = resolveIntrospectionSettings(
    options.introspectionMode,
    undefined
  );
  return Object.assign(makePostGraphilePgService({
    pool: options.pool,
    schemas: options.schemas,
    pgSettingsForIntrospection
  }), {
    introspectionMode: options.introspectionMode,
    introspectionScopedCatalogTypes: options.introspectionScopedCatalogTypes,
    introspectionAllowedDependencySchemas:
      options.introspectionAllowedDependencySchemas ?? [],
    ...(options.introspectionCapabilityExtensions === undefined
      ? {}
      : {
        introspectionCapabilityExtensions:
          options.introspectionCapabilityExtensions
      })
  });
}

const graphileTestDirectory = dirname(require.resolve('graphile-test'));
const { getConnections } = require(require.resolve('pgsql-test', {
  paths: [graphileTestDirectory]
})) as {
  getConnections: (
    options: Record<string, never>,
    seeders: never[]
  ) => Promise<ConnectionResult>;
};

const graphileBuildPgDirectory = dirname(require.resolve('graphile-build-pg'));
const {
  makeIntrospectionQuery,
  makeSchemaScopedIntrospectionQuery,
  parseIntrospectionResults
} = require(require.resolve('pg-introspection', {
  paths: [graphileBuildPgDirectory]
})) as {
  makeIntrospectionQuery: () => string;
  makeSchemaScopedIntrospectionQuery: (
    schemas: readonly string[],
    options: {
      catalogTypes: 'dependency-closure';
      capabilityExtensions?: readonly string[];
    }
  ) => { text: string; values: [string[], string[]] };
  parseIntrospectionResults: (value: string) => RawIntrospection;
};

function unsupportedExtensions(missing: readonly string[]): Error & {
  code: string;
} {
  const code = 'GRAPHILE_CLOSURE_UNSUPPORTED_EXTENSIONS';
  return Object.assign(
    new Error(`${code}: ${sorted(missing).join(', ')}`),
    { code }
  );
}

function unsupportedExtensionSchema(extension: string): Error & {
  code: string;
  extension: string;
} {
  const code = 'GRAPHILE_CLOSURE_UNSUPPORTED_EXTENSION_SCHEMA';
  return Object.assign(new Error(`${code}: ${extension}`), {
    code,
    extension
  });
}

function extensionNamedBy(error: unknown): string | undefined {
  const candidate = error as { message?: unknown; detail?: unknown };
  const diagnostic = [candidate?.message, candidate?.detail]
    .filter((value): value is string => typeof value === 'string')
    .join(' ')
    .toLowerCase();
  return REQUIRED_EXTENSIONS.find((extension) =>
    diagnostic.includes(extension.toLowerCase())
  );
}

function sorted(values: Iterable<string>): string[] {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function captureCatalog(introspection: RawIntrospection) {
  const namespaces = new Map(
    introspection.namespaces.map(({ _id, nspname }) => [String(_id), nspname])
  );
  const classes = new Map(
    introspection.classes.map(({ _id, relname }) => [String(_id), relname])
  );
  const capturedTypeNames = new Set([
    `${API_SCHEMA}.closure_status`,
    `${API_SCHEMA}._closure_status`,
    `${API_SCHEMA}.closure_label`,
    `${API_SCHEMA}._closure_label`,
    `${API_SCHEMA}.closure_payload`,
    `${API_SCHEMA}._closure_payload`,
    `${API_SCHEMA}.score_window`,
    `${API_SCHEMA}._score_window`,
    `${API_SCHEMA}.score_window_multirange`,
    `${API_SCHEMA}._score_window_multirange`,
    `${EXTENSION_SCHEMA}.ltree`,
    `${EXTENSION_SCHEMA}._ltree`,
    `${EXTENSION_SCHEMA}.vector`,
    `${EXTENSION_SCHEMA}._vector`,
    `${EXTENSION_SCHEMA}.geometry`,
    `${EXTENSION_SCHEMA}._geometry`,
    'pg_catalog.tsvector',
    'pg_catalog._tsvector'
  ]);

  return {
    namespaces: sorted(
      introspection.namespaces
        .map(({ nspname }) => nspname)
        .filter((name) =>
          [API_SCHEMA, EXTENSION_SCHEMA, 'pg_catalog'].includes(name)
        )
    ),
    extensions: sorted(
      introspection.extensions
        .map(({ extname }) => extname)
        .filter((name) => (REQUIRED_EXTENSIONS as readonly string[]).includes(name))
    ),
    indexes: sorted(
      introspection.indexes
        .map(({ indexrelid }) => classes.get(String(indexrelid)))
        .filter((name): name is string =>
          name !== undefined && (REQUIRED_INDEXES as readonly string[]).includes(name)
        )
    ),
    types: introspection.types
      .map((type) => ({
        name: `${namespaces.get(String(type.typnamespace))}.${type.typname}`,
        typtype: type.typtype,
        typelem: String(type.typelem),
        typarray: String(type.typarray)
      }))
      .filter(({ name }) => capturedTypeNames.has(name))
      .sort((left, right) => left.name.localeCompare(right.name))
  };
}

function recordFields(schema: GraphQLSchema): string[] {
  const type = schema.getType('ClosureRecord');
  if (!type || !isObjectType(type)) return [];
  return sorted(Object.keys(type.getFields()));
}

function qualification(schema: GraphQLSchema): {
  code?: string;
  missingFields: string[];
  productionQualified: boolean;
} {
  const fields = new Set(recordFields(schema));
  const queryFields = new Set(Object.keys(schema.getQueryType()?.getFields() ?? {}));
  const missingFields = [
    ...REQUIRED_RECORD_FIELDS
      .filter((field) => !fields.has(field))
      .map((field) => `ClosureRecord.${field}`),
    ...[
      'closureRecords',
      'closureFunctionProbe',
      'closureMultirangeProbe',
      'closureTimestampMultirangeProbe'
    ]
      .filter((field) => !queryFields.has(field))
      .map((field) => `Query.${field}`)
  ];

  return missingFields.length === 0
    ? { productionQualified: true, missingFields: [] }
    : {
      code: 'GRAPHILE_CLOSURE_CAPABILITY_MISMATCH',
      missingFields,
      productionQualified: false
    };
}

async function build(
  pool: Pool,
  mode: 'stock' | 'scoped-required',
  schemaName = API_SCHEMA
) {
  const pgService = makePgService({
    pool,
    schemas: [schemaName],
    introspectionMode: mode,
    ...(mode === 'scoped-required'
      ? {
        introspectionScopedCatalogTypes: 'dependency-closure' as const,
        introspectionAllowedDependencySchemas: [EXTENSION_SCHEMA],
        introspectionCapabilityExtensions: REQUIRED_EXTENSIONS
      }
      : {})
  });
  const built = await makeSchema({
    extends: [createConstructivePreset({ preloadedStorageModules: [] })],
    pgServices: [pgService]
  });
  return { ...built, pgService, schemaName };
}

async function runDocument(
  built: BuiltSchema,
  document: ReturnType<typeof parse>,
  variableValues: Record<string, unknown> = {}
): Promise<ExecutionResult<Record<string, unknown>>> {
  const withPgClientKey = built.pgService.withPgClientKey ?? 'withPgClient';
  const result = await execute({
    schema: built.schema,
    document,
    variableValues,
    contextValue: {
      // Shared extension schemas are deliberately absent. Plugin SQL must use
      // the introspected physical schema instead of relying on search_path.
      pgSettings: { search_path: `pg_catalog,${built.schemaName}` },
      [withPgClientKey]: withPgClientFromPgService.bind(
        null,
        built.pgService
      )
    },
    resolvedPreset: built.resolvedPreset
  }) as ExecutionResult<Record<string, unknown>>;
  if (Symbol.asyncIterator in result) {
    throw new Error('capability closure canary unexpectedly returned a stream');
  }
  return result;
}

describe('schema-scoped dependency-closure capability matrix', () => {
  let pg: PgTestClientLike;
  let pool: Pool;
  let teardown: () => Promise<void>;
  let stock: BuiltSchema;
  let scoped: BuiltSchema;
  let plainStock: BuiltSchema;
  let plainScoped: BuiltSchema;
  let stockIntrospection: RawIntrospection;
  let scopedIntrospection: RawIntrospection;
  let plainScopedIntrospection: RawIntrospection;
  let transactionStarted = false;

  beforeAll(async () => {
    const connections = await getConnections({}, []);
    ({ pg, teardown } = connections);
    pool = connections.manager.getPool(pg.config);

    const available = await pg.query<{ name: string }>(`
      SELECT name
      FROM pg_catalog.pg_available_extensions
      WHERE name = ANY($1::text[])
    `, [[...REQUIRED_EXTENSIONS]]);
    const found = new Set(available.rows.map(({ name }) => name));
    const missing = REQUIRED_EXTENSIONS.filter((name) => !found.has(name));
    if (missing.length > 0) throw unsupportedExtensions(missing);

    try {
      await pg.query(readFileSync(FIXTURE, 'utf8'));
    } catch (error) {
      const extension = extensionNamedBy(error);
      if (extension) throw unsupportedExtensionSchema(extension);
      throw error;
    }

    const stockQuery = { text: makeIntrospectionQuery() };
    const scopedQuery = makeSchemaScopedIntrospectionQuery([API_SCHEMA], {
      catalogTypes: 'dependency-closure',
      capabilityExtensions: REQUIRED_EXTENSIONS
    });
    const plainScopedQuery = makeSchemaScopedIntrospectionQuery(
      [PLAIN_API_SCHEMA],
      {
        catalogTypes: 'dependency-closure',
        capabilityExtensions: REQUIRED_EXTENSIONS
      }
    );
    const [stockResult, scopedResult, plainScopedResult] = await Promise.all([
      pool.query<{ introspection: string }>(stockQuery),
      pool.query<{ introspection: string }>(scopedQuery),
      pool.query<{ introspection: string }>(plainScopedQuery)
    ]);
    stockIntrospection = parseIntrospectionResults(
      stockResult.rows[0].introspection
    );
    scopedIntrospection = parseIntrospectionResults(
      scopedResult.rows[0].introspection
    );
    plainScopedIntrospection = parseIntrospectionResults(
      plainScopedResult.rows[0].introspection
    );

    stock = await build(pool, 'stock');
    scoped = await build(pool, 'scoped-required');
    plainStock = await build(pool, 'stock', PLAIN_API_SCHEMA);
    plainScoped = await build(pool, 'scoped-required', PLAIN_API_SCHEMA);
  });

  beforeEach(async () => {
    await pg.beforeEach();
    transactionStarted = true;
  });

  afterEach(async () => {
    if (transactionStarted) {
      transactionStarted = false;
      await pg.afterEach();
    }
  });

  afterAll(async () => {
    if (teardown) await teardown();
  });

  it('retains the required type, extension, namespace, and index closure', async () => {
    const stockCatalog = captureCatalog(stockIntrospection);
    const scopedCatalog = captureCatalog(scopedIntrospection);

    expect(scopedCatalog).toEqual(stockCatalog);
    expect(scopedCatalog.namespaces).toEqual([
      API_SCHEMA,
      EXTENSION_SCHEMA,
      'pg_catalog'
    ]);
    expect(scopedCatalog.extensions).toEqual([...REQUIRED_EXTENSIONS]);
    expect(scopedCatalog.indexes).toEqual([...REQUIRED_INDEXES]);
    expect(scopedCatalog.types.map(({ name, typtype }) => ({ name, typtype })))
      .toEqual(expect.arrayContaining([
        { name: `${API_SCHEMA}.closure_status`, typtype: 'e' },
        { name: `${API_SCHEMA}.closure_label`, typtype: 'd' },
        { name: `${API_SCHEMA}.closure_payload`, typtype: 'c' },
        { name: `${API_SCHEMA}.score_window`, typtype: 'r' },
        { name: `${API_SCHEMA}.score_window_multirange`, typtype: 'm' },
        { name: `${API_SCHEMA}._closure_status`, typtype: 'b' },
        { name: `${API_SCHEMA}._closure_label`, typtype: 'b' },
        { name: `${API_SCHEMA}._closure_payload`, typtype: 'b' },
        { name: `${API_SCHEMA}._score_window`, typtype: 'b' },
        { name: `${API_SCHEMA}._score_window_multirange`, typtype: 'b' }
      ]));

    const installed = await pg.query<{
      extname: string;
      nspname: string;
    }>(`
      SELECT extension.extname, namespace.nspname
      FROM pg_catalog.pg_extension AS extension
      JOIN pg_catalog.pg_namespace AS namespace
        ON namespace.oid = extension.extnamespace
      WHERE extension.extname = ANY($1::text[])
      ORDER BY extension.extname
    `, [[...REQUIRED_EXTENSIONS]]);
    expect(installed.rows).toEqual(
      REQUIRED_EXTENSIONS.map((extname) => ({
        extname,
        nspname: EXTENSION_SCHEMA
      }))
    );
  });

  it('builds byte-equivalent SDL and qualifies every required field', () => {
    const stockSdl = printSchema(lexicographicSortSchema(stock.schema));
    const scopedSdl = printSchema(lexicographicSortSchema(scoped.schema));

    expect(scopedSdl).toBe(stockSdl);
    expect(recordFields(stock.schema)).toEqual(
      expect.arrayContaining(REQUIRED_RECORD_FIELDS)
    );
    expect(recordFields(scoped.schema)).toEqual(
      expect.arrayContaining(REQUIRED_RECORD_FIELDS)
    );
    expect(qualification(stock.schema)).toEqual({
      missingFields: [],
      productionQualified: true
    });
    expect(qualification(scoped.schema)).toEqual({
      missingFields: [],
      productionQualified: true
    });
  });

  it('retains installed extension capabilities without an object dependency', async () => {
    const stockExtensions = sorted(stockIntrospection.extensions
      .map(({ extname }) => extname)
      .filter((name) => (REQUIRED_EXTENSIONS as readonly string[]).includes(name)));
    const scopedExtensions = sorted(
      plainScopedIntrospection.extensions.map(({ extname }) => extname)
    );
    const stockLanguages = sorted(
      stockIntrospection.languages.map(({ lanname }) => lanname)
    );
    const scopedLanguages = sorted(
      plainScopedIntrospection.languages.map(({ lanname }) => lanname)
    );
    const stockAccessMethods = sorted(
      stockIntrospection.am.map(({ amname }) => amname)
    );
    const scopedAccessMethods = sorted(
      plainScopedIntrospection.am.map(({ amname }) => amname)
    );

    expect(scopedExtensions).toEqual(stockExtensions);
    expect(scopedLanguages).toEqual(stockLanguages);
    expect(scopedAccessMethods).toEqual(stockAccessMethods);
    expect(scopedExtensions).toEqual(expect.arrayContaining([
      ...REQUIRED_EXTENSIONS
    ]));
    expect(scopedExtensions).not.toContain('plpgsql');
    expect(scopedExtensions.length).toBeLessThan(MAX_SERVICE_CATALOG_ROWS);
    expect(scopedLanguages.length).toBeLessThan(MAX_SERVICE_CATALOG_ROWS);
    expect(scopedAccessMethods.length).toBeLessThan(MAX_SERVICE_CATALOG_ROWS);
    expect(sorted(
      plainScopedIntrospection.namespaces.map(({ nspname }) => nspname)
    )).toEqual([EXTENSION_SCHEMA, PLAIN_API_SCHEMA, 'pg_catalog']);

    const stockSdl = printSchema(lexicographicSortSchema(plainStock.schema));
    const scopedSdl = printSchema(lexicographicSortSchema(plainScoped.schema));
    expect(scopedSdl).toBe(stockSdl);

    const plainRecord = plainStock.schema.getType('PlainRecord');
    expect(plainRecord && isObjectType(plainRecord)
      ? Object.keys(plainRecord.getFields())
      : []).toEqual(expect.arrayContaining(['body', 'bodyTrgmSimilarity']));
    expect(plainStock.schema.getQueryType()?.getFields().plainRecords)
      .toBeDefined();

    const [stockResult, scopedResult] = await Promise.all([
      runDocument(plainStock, PLAIN_EXTENSION_DOCUMENT),
      runDocument(plainScoped, PLAIN_EXTENSION_DOCUMENT)
    ]);
    expect(stockResult.errors).toBeUndefined();
    expect(scopedResult).toEqual(stockResult);
    expect((stockResult.data?.plainRecords as { nodes: unknown[] }).nodes)
      .toHaveLength(1);
  });

  it('executes matching core and extension documents without extension search_path', async () => {
    const [stockCore, scopedCore, stockExtensions, scopedExtensions] =
      await Promise.all([
        runDocument(stock, CORE_DOCUMENT),
        runDocument(scoped, CORE_DOCUMENT),
        runDocument(stock, EXTENSION_DOCUMENT, { bbox: BBOX }),
        runDocument(scoped, EXTENSION_DOCUMENT, { bbox: BBOX })
      ]);

    expect(stockCore.errors).toBeUndefined();
    expect(scopedCore).toEqual(stockCore);
    expect(scopedExtensions).toEqual(stockExtensions);
    expect(stockExtensions.errors).toBeUndefined();

    const records = (stockCore.data?.closureRecords as {
      nodes: Array<{ scoreWindows: unknown[] }>;
    }).nodes;
    expect(records[0].scoreWindows).toHaveLength(2);
    expect(stockCore.data?.closureMultirangeProbe).toHaveLength(2);
    expect(stockCore.data?.closureTimestampMultirangeProbe).toHaveLength(2);

    const extensionData = stockExtensions.data as Record<
      string,
      { nodes: unknown[] } | null
    >;
    for (const alias of [
      'tsvector',
      'trigram',
      'bm25',
      'vector',
      'postgis',
      'ltree'
    ]) {
      expect(extensionData[alias]?.nodes).toHaveLength(1);
    }
  });
});
