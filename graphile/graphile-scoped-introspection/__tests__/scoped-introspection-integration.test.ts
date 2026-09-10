import { createHash } from 'node:crypto';
import { join } from 'node:path';

import {
  defaultPreset as graphileBuildPreset,
  makeSchema,
} from 'graphile-build';
import { defaultPreset as graphileBuildPgPreset } from 'graphile-build-pg';
import type { GraphileConfig } from 'graphile-config';
import {
  type GraphQLSchema,
  lexicographicSortSchema,
  parse,
  printSchema,
} from 'graphql';
import type { Introspection } from 'pg-introspection';
import { getConnections, type PgTestClient,seed } from 'pgsql-test';

const { withPgClientFromPgService } = require('postgraphile/@dataplan/pg') as {
  withPgClientFromPgService: (...args: readonly unknown[]) => unknown;
};
type GrafastExecutionResult = {
  data?: Record<string, unknown> | null;
  errors?: readonly unknown[];
};
type GrafastExecution = GrafastExecutionResult | AsyncIterable<unknown>;
const { execute } = require('postgraphile/grafast') as {
  execute(options: {
    schema: GraphQLSchema;
    document: ReturnType<typeof parse>;
    resolvedPreset: GraphileConfig.ResolvedPreset;
    contextValue: Record<string, unknown>;
  }): GrafastExecution | Promise<GrafastExecution>;
};

import { ScopedIntrospectionPreset } from '../src';

const { makePgService } = require('postgraphile/adaptors/pg') as {
  makePgService(
    options: Record<string, unknown>
  ): GraphileConfig.PgServiceConfiguration;
};

const ROOT_SCHEMA = 'scope_root';
const DEPENDENCY_SCHEMA = 'scope_dependency';
const UNRELATED_SCHEMA = 'scope_unrelated';
const EXTENSION_SCHEMA = 'scope_extension';
const CAPABILITY_ROOT_SCHEMA = 'scope_capability_root';

type ScopedConfig =
  | true
  | {
      catalogTypes: 'dependency-closure';
      capabilityExtensions: readonly string[];
    };

interface SchemaBuild {
  schema: GraphQLSchema;
  resolvedPreset: GraphileConfig.ResolvedPreset;
  service: GraphileConfig.PgServiceConfiguration;
  introspection: Introspection;
  hash: string;
}

const fixture = (file: string): string => join(__dirname, 'fixtures', file);

const makeCapturePlugin = (
  capture: (introspection: Introspection) => void
): GraphileConfig.Plugin => ({
  name: 'ScopedIntrospectionCapturePlugin',
  gather: {
    namespace: 'scopedIntrospectionCapture' as const,
    hooks: {
      pgIntrospection_introspection(_info: unknown, event: { introspection: Introspection }) {
        capture(event.introspection);
      },
    },
  },
}) as unknown as GraphileConfig.Plugin;

describe('schema-scoped PostgreSQL introspection', () => {
  let teardown: (() => Promise<void>) | undefined;
  let pool: ReturnType<Awaited<ReturnType<typeof getConnections>>['manager']['getPool']>;
  let pg: PgTestClient;
  let db: PgTestClient;
  const services: GraphileConfig.PgServiceConfiguration[] = [];
  let stock: SchemaBuild;
  let scopedDefault: SchemaBuild;
  let scoped: SchemaBuild;

  const buildSchema = async (
    scopedConfig: false | ScopedConfig,
    rootSchema = ROOT_SCHEMA
  ): Promise<SchemaBuild> => {
    let introspection: Introspection | undefined;
    const service = makePgService({
      pool,
      schemas: [rootSchema],
      pubsub: false,
    });
    services.push(service);
    const serviceName = String(service.name);
    let built = false;
    try {
      const result = await makeSchema({
        extends: [
          graphileBuildPreset,
          graphileBuildPgPreset,
          ScopedIntrospectionPreset,
        ],
        ...(scopedConfig !== false
          ? {
            gather: {
              pgScopedIntrospection: {
                [serviceName]: scopedConfig,
              },
            },
          }
          : {}),
        plugins: [
          makeCapturePlugin((value) => {
            introspection = value;
          }),
        ],
        pgServices: [service as never],
      });
      if (!introspection) {
        throw new Error(
          'PostgreSQL introspection lifecycle event was not emitted'
        );
      }
      const sdl = printSchema(lexicographicSortSchema(result.schema));
      built = true;
      return {
        schema: result.schema,
        resolvedPreset: result.resolvedPreset,
        service,
        introspection,
        hash: createHash('sha256').update(sdl).digest('hex'),
      };
    } finally {
      if (!built) {
        services.splice(services.indexOf(service), 1);
        await service.release?.();
      }
    }
  };

  const executeSchema = async (
    built: SchemaBuild,
    document: ReturnType<typeof parse>
  ): Promise<GrafastExecutionResult> => {
    const execution = await execute({
      schema: built.schema,
      document,
      resolvedPreset: built.resolvedPreset,
      contextValue: {
        [built.service.pgSettingsKey!]: {},
        [built.service.withPgClientKey!]: withPgClientFromPgService.bind(
          null,
          built.service
        ),
      },
    });
    if (
      execution !== null &&
      typeof execution === 'object' &&
      Symbol.asyncIterator in execution
    ) {
      throw new Error(
        'Integration query unexpectedly returned an async iterable'
      );
    }
    return execution as GrafastExecutionResult;
  };

  beforeAll(async () => {
    const connections = await getConnections({}, [
      seed.sqlfile([fixture('scoped-introspection.sql')]),
    ]);
    pg = connections.pg;
    db = connections.db;
    teardown = connections.teardown;
    pool = connections.manager.getPool(connections.pg.config);
    stock = await buildSchema(false);
    scopedDefault = await buildSchema(true);
    scoped = await buildSchema({
      catalogTypes: 'dependency-closure',
      capabilityExtensions: ['pg_trgm'],
    });
  }, 120_000);

  afterAll(async () => {
    for (const service of services) {
      await service.release?.();
    }
    await teardown?.();
  });

  beforeEach(async () => {
    await pg.beforeEach();
    await db.beforeEach();
  });

  afterEach(async () => {
    await db.afterEach();
    await pg.afterEach();
  });

  it('builds the same schema and a working runtime', async () => {
    expect(scopedDefault.hash).toBe(stock.hash);

    const document = parse('{ __typename }');
    const stockResult = await executeSchema(stock, document);
    const scopedResult = await executeSchema(scopedDefault, document);
    expect(scopedResult).toEqual(stockResult);
    expect(scopedResult.errors).toBeUndefined();
    expect(scopedResult.data?.__typename).toBe('Query');
  });

  it('executes a retained table and function through the scoped schema', async () => {
    const queryFields = scopedDefault.schema.getQueryType()!.getFields();
    const tableFieldName = Object.keys(queryFields).find((name) =>
      name.toLowerCase().includes('closureitems')
    );
    if (!tableFieldName) {
      throw new Error(
        `Scoped fixture table field was not generated; query fields: ${Object.keys(queryFields).join(', ')}`
      );
    }

    const tableResult = await executeSchema(
      scopedDefault,
      parse(`{ ${tableFieldName} { nodes { title } } }`)
    );
    expect(tableResult.errors).toBeUndefined();
    expect(tableResult.data?.[tableFieldName!]).toEqual({
      nodes: [{ title: 'scoped fixture item' }],
    });

    const functionFieldName = Object.keys(queryFields).find((name) =>
      name.toLowerCase().includes('echodependencystatus')
    );
    if (!functionFieldName) {
      throw new Error(
        `Scoped fixture function field was not generated; query fields: ${Object.keys(queryFields).join(', ')}`
      );
    }
    const functionField = queryFields[functionFieldName!];
    expect(functionField.args).toHaveLength(1);
    const argument = functionField.args[0];
    let argumentType = argument.type;
    while ('ofType' in argumentType) argumentType = argumentType.ofType;
    const enumValue = 'getValues' in argumentType
      ? argumentType
        .getValues()
        .find(
          (value: { name: string }) =>
            value.name.toLowerCase() === 'active'
        )
      : undefined;
    if (!enumValue) {
      throw new Error(
        `Scoped fixture function argument did not expose active; type: ${argumentType.toString()}; values: ${'getValues' in argumentType ? argumentType.getValues().map((value: { name: string }) => value.name).join(', ') : 'none'}`
      );
    }

    const functionResult = await executeSchema(
      scopedDefault,
      parse(`{ ${functionFieldName}(${argument.name}: ${enumValue!.name}) }`)
    );
    expect(functionResult.errors).toBeUndefined();
    expect(functionResult.data?.[functionFieldName!]).toBe(enumValue.name);
  });

  it('retains transitive table, function, and range type dependencies', () => {
    const namespaceNames = scoped.introspection.namespaces.map(
      (namespace) => namespace.nspname
    );
    expect(namespaceNames).toEqual(
      expect.arrayContaining([
        ROOT_SCHEMA,
        DEPENDENCY_SCHEMA,
        EXTENSION_SCHEMA,
        'pg_catalog',
      ])
    );
    expect(namespaceNames).not.toContain(UNRELATED_SCHEMA);

    const rootTable = scoped.introspection.classes.find(
      (entity) =>
        entity.relname === 'closure_items' &&
        entity.getNamespace()?.nspname === ROOT_SCHEMA
    );
    expect(rootTable).toBeDefined();
    const attributeTypes = new Map(
      rootTable!
        .getAttributes()
        .map((attribute) => [attribute.attname, attribute.getType()])
    );
    expect(attributeTypes.get('status')?.typname).toBe('item_status');
    expect(attributeTypes.get('score')?.typname).toBe('positive_integer');
    expect(attributeTypes.get('payload')?.typname).toBe('item_payload');
    expect(attributeTypes.get('active_span')?.typname).toBe('integer_span');

    const statusType = attributeTypes.get('status');
    expect(statusType?.getEnumValues().map((value) => value.enumlabel)).toEqual([
      'draft',
      'active',
      'archived',
    ]);
    expect(statusType?.getArrayType()?.typname).toBe('_item_status');

    const payloadType = attributeTypes.get('payload');
    expect(
      payloadType
        ?.getClass()
        ?.getAttributes()
        .map((attribute) => attribute.getType()?.typname)
    ).toEqual(['item_status', 'positive_integer']);

    const echoStatus = scoped.introspection.procs.find(
      (proc) =>
        proc.proname === 'echo_dependency_status' &&
        proc.getNamespace()?.nspname === ROOT_SCHEMA
    );
    expect(echoStatus?.getReturnType()?.typname).toBe('item_status');
    expect(
      echoStatus?.getArguments().map((argument) => argument.type.typname)
    ).toEqual(['item_status']);

    const makePayload = scoped.introspection.procs.find(
      (proc) =>
        proc.proname === 'make_dependency_payload' &&
        proc.getNamespace()?.nspname === ROOT_SCHEMA
    );
    expect(makePayload?.getReturnType()?.typname).toBe('item_payload');
    expect(
      makePayload?.getArguments().map((argument) => argument.type.typname)
    ).toEqual(['item_status', 'positive_integer']);

    const range = scoped.introspection.ranges.find(
      (entity) => entity.getType()?.typname === 'integer_span'
    );
    expect(range?.getSubType()?.typname).toBe('int4');
    expect(
      scoped.introspection.types.find(
        (type) => type._id === range?.rngmultitypid
      )?.typname
    ).toBe('integer_span_set');

    const foreignKey = rootTable
      ?.getConstraints()
      .find((constraint) => constraint.contype === 'f');
    expect(foreignKey?.getForeignClass()?.relname).toBe('dependency_owners');
    expect(foreignKey?.getForeignClass()?.getNamespace()?.nspname).toBe(
      DEPENDENCY_SCHEMA
    );

    const inheritedItems = scoped.introspection.classes.find(
      (entity) =>
        entity.relname === 'inherited_items' &&
        entity.getNamespace()?.nspname === ROOT_SCHEMA
    );
    const inherited = inheritedItems?.getInherited();
    expect(inherited).toHaveLength(1);
    expect(
      scoped.introspection.classes.find(
        (entity) => entity._id === inherited?.[0]?.inhparent
      )?.relname
    ).toBe('inherited_base');
    expect(
      scoped.introspection.classes.some(
        (entity) => entity.relname === 'reverse_inherited_item'
      )
    ).toBe(false);
  });

  it('retains indexes and identifies their owning extension', () => {
    const indexNames = scoped.introspection.indexes.map(
      (index) => index.getIndexClass()?.relname
    );
    expect(indexNames).toEqual(
      expect.arrayContaining([
        'closure_items_status_idx',
        'closure_items_title_gin_trgm_idx',
        'closure_items_title_gist_trgm_idx',
      ])
    );
    expect(
      scoped.introspection.extensions.some(
        (extension) => extension.extname === 'pg_trgm'
      )
    ).toBe(true);
    expect(
      scoped.introspection.types.some(
        (type) => type.getNamespace()?.nspname === UNRELATED_SCHEMA
      )
    ).toBe(false);
    expect(
      scoped.introspection.procs.some(
        (proc) => proc.getNamespace()?.nspname === UNRELATED_SCHEMA
      )
    ).toBe(false);
  });

  it('retains explicitly requested extension capability metadata', async () => {
    const capabilityOnly = await buildSchema(
      {
        catalogTypes: 'dependency-closure',
        capabilityExtensions: ['pg_trgm'],
      },
      CAPABILITY_ROOT_SCHEMA
    );

    expect(
      capabilityOnly.introspection.extensions.some(
        (extension) => extension.extname === 'pg_trgm'
      )
    ).toBe(true);
    expect(
      capabilityOnly.introspection.indexes.some((index) =>
        index.getIndexClass()?.relname.includes('trgm')
      )
    ).toBe(false);
  });

  it('fails fast when a configured root schema is missing', async () => {
    await expect(buildSchema(true, 'scope_missing_root')).rejects.toThrow(
      /validation failed.*did not find required schema\(s\): scope_missing_root/u
    );
  });
});
