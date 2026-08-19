import '@dataplan/pg/adaptors/pg';

import { createHash } from 'node:crypto';
import { join } from 'node:path';

import {
  defaultPreset as graphileBuildPreset,
  makeSchema,
} from 'graphile-build';
import { defaultPreset as graphileBuildPgPreset } from 'graphile-build-pg';
import type { GraphileConfig } from 'graphile-config';
import {
  execute,
  type GraphQLSchema,
  lexicographicSortSchema,
  parse,
  printSchema,
} from 'graphql';
import { getConnections, seed } from 'pgsql-test';
import { makePgService } from 'postgraphile/adaptors/pg';

import {
  type Introspection,
  ScopedIntrospectionPreset,
} from '../src';

const ROOT_SCHEMA = 'scope_root';
const DEPENDENCY_SCHEMA = 'scope_dependency';
const UNRELATED_SCHEMA = 'scope_unrelated';
const EXTENSION_SCHEMA = 'scope_extension';
const CAPABILITY_ROOT_SCHEMA = 'scope_capability_root';

type TestConnections = Awaited<ReturnType<typeof getConnections>>;
type TestPool = ReturnType<TestConnections['manager']['getPool']>;

interface SchemaBuild {
  schema: GraphQLSchema;
  introspection: Introspection;
  hash: string;
}

const makeCapturePlugin = (
  name: string,
  capture: (introspection: Introspection) => void
): GraphileConfig.Plugin =>
  ({
    name,
    gather: {
      namespace: `${name}Namespace`,
      hooks: {
        pgIntrospection_introspection(_info, event) {
          capture(event.introspection);
        },
      },
    },
  }) as GraphileConfig.Plugin;

const buildSchema = async (
  pool: TestPool,
  scoped: boolean,
  allowedDependencySchemas: readonly string[] = [],
  rootSchema = ROOT_SCHEMA
): Promise<SchemaBuild> => {
  let introspection: Introspection | undefined;
  const service = Object.assign(
    makePgService({ pool, schemas: [rootSchema] }),
    scoped
      ? {
        scopedIntrospection: true as const,
        introspectionAllowedDependencySchemas: allowedDependencySchemas,
        introspectionScopedCatalogTypes: 'dependency-closure' as const,
        introspectionCapabilityExtensions: ['pg_trgm'],
      }
      : {}
  );

  try {
    const result = await makeSchema({
      extends: [
        graphileBuildPreset,
        graphileBuildPgPreset,
        ...(scoped ? [ScopedIntrospectionPreset] : []),
      ],
      plugins: [
        makeCapturePlugin(
          scoped
            ? 'ScopedDependencyClosureCapturePlugin'
            : 'StockDependencyClosureCapturePlugin',
          (value) => {
            introspection = value;
          }
        ),
      ],
      pgServices: [service],
    });
    if (!introspection) {
      throw new Error('Graphile introspection lifecycle event was not emitted');
    }
    const sdl = printSchema(lexicographicSortSchema(result.schema));
    return {
      schema: result.schema,
      introspection,
      hash: createHash('sha256').update(sdl).digest('hex'),
    };
  } finally {
    await service.release();
  }
};

describe('real PostgreSQL dependency closure', () => {
  let connections: TestConnections;
  let pool: TestPool;
  let stock: SchemaBuild;
  let scoped: SchemaBuild;

  beforeAll(async () => {
    connections = await getConnections({}, [
      seed.sqlfile([join(__dirname, 'fixtures/dependency-closure.sql')]),
    ]);
    pool = connections.manager.getPool(connections.pg.config);
    stock = await buildSchema(pool, false);
    scoped = await buildSchema(pool, true, [
      DEPENDENCY_SCHEMA,
      EXTENSION_SCHEMA,
    ]);
  });

  beforeEach(async () => {
    await connections.pg.beforeEach();
    await connections.db.beforeEach();
  });

  afterEach(async () => {
    await connections.db.afterEach();
    await connections.pg.afterEach();
  });

  afterAll(async () => {
    await connections.teardown();
  });

  it('builds equivalent stock and scoped schemas with a working runtime', async () => {
    expect(scoped.hash).toBe(stock.hash);

    const document = parse('{ __typename }');
    const stockResult = await execute({ schema: stock.schema, document });
    const scopedResult = await execute({ schema: scoped.schema, document });
    expect(stockResult.errors).toBeUndefined();
    expect(scopedResult).toEqual(stockResult);
    expect(scopedResult.data?.__typename).toBe('Query');
  });

  it('retains cross-schema table, function, and range type dependencies', () => {
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
    for (const type of attributeTypes.values()) {
      if (type?.typname === 'text' || type?.typname === 'int8') continue;
      expect(type?.getNamespace()?.nspname).toBe(DEPENDENCY_SCHEMA);
    }

    const statusType = attributeTypes.get('status');
    expect(statusType?.getEnumValues().map((value) => value.enumlabel)).toEqual([
      'draft',
      'active',
      'archived',
    ]);
    expect(statusType?.getArrayType()?.typname).toBe('_item_status');

    const scoreType = attributeTypes.get('score');
    expect(scoreType?.typtype).toBe('d');
    expect(
      scoped.introspection.types.find(
        (type) => type._id === scoreType?.typbasetype
      )?.typname
    ).toBe('int4');

    const payloadType = attributeTypes.get('payload');
    const payloadAttributeTypes = payloadType
      ?.getClass()
      ?.getAttributes()
      .map((attribute) => attribute.getType()?.typname);
    expect(payloadAttributeTypes).toEqual(['item_status', 'positive_integer']);

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
  });

  it('retains cross-schema foreign-key targets and required inheritance parents only', () => {
    const closureItems = scoped.introspection.classes.find(
      (entity) =>
        entity.relname === 'closure_items' &&
        entity.getNamespace()?.nspname === ROOT_SCHEMA
    );
    const foreignKey = closureItems
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
        (entity) =>
          entity.relname === 'reverse_inherited_item' &&
          entity.getNamespace()?.nspname === DEPENDENCY_SCHEMA
      )
    ).toBe(false);
  });

  it('retains ordinary and pg_trgm index metadata without unrelated entities', async () => {
    const indexes = new Map(
      scoped.introspection.indexes.map((index) => [
        index.getIndexClass()?.relname,
        index,
      ])
    );
    expect(indexes.has('closure_items_status_idx')).toBe(true);
    expect(indexes.has('closure_items_score_idx')).toBe(true);
    expect(indexes.has('closure_items_title_gin_trgm_idx')).toBe(true);
    expect(indexes.has('closure_items_title_gist_trgm_idx')).toBe(true);

    const opclasses = await connections.pg.query<{
      oid: string;
      opcname: string;
      support_function_count: number;
    }>(
      `
        SELECT
          pg_opclass.oid::text AS oid,
          pg_opclass.opcname,
          count(DISTINCT support_proc.oid)::integer AS support_function_count
        FROM pg_catalog.pg_opclass
        INNER JOIN pg_catalog.pg_namespace
          ON pg_namespace.oid = pg_opclass.opcnamespace
        INNER JOIN pg_catalog.pg_amproc
          ON pg_amproc.amprocfamily = pg_opclass.opcfamily
        INNER JOIN pg_catalog.pg_proc AS support_proc
          ON support_proc.oid = pg_amproc.amproc
        INNER JOIN pg_catalog.pg_depend
          ON pg_depend.classid = 'pg_catalog.pg_proc'::regclass
          AND pg_depend.objid = support_proc.oid
          AND pg_depend.refclassid = 'pg_catalog.pg_extension'::regclass
          AND pg_depend.deptype = 'e'
        INNER JOIN pg_catalog.pg_extension
          ON pg_extension.oid = pg_depend.refobjid
        WHERE pg_namespace.nspname = $1
          AND pg_opclass.opcname = ANY($2::text[])
          AND pg_extension.extname = 'pg_trgm'
        GROUP BY pg_opclass.oid, pg_opclass.opcname
      `,
      [EXTENSION_SCHEMA, ['gin_trgm_ops', 'gist_trgm_ops']]
    );
    const opclassByName = new Map(
      opclasses.rows.map(({ oid, opcname }) => [opcname, oid])
    );
    expect(opclasses.rows).toHaveLength(2);
    expect(
      opclasses.rows.every(({ support_function_count }) =>
        support_function_count > 0
      )
    ).toBe(true);
    expect(
      indexes.get('closure_items_title_gin_trgm_idx')?.indclass
    ).toContain(opclassByName.get('gin_trgm_ops'));
    expect(
      indexes.get('closure_items_title_gist_trgm_idx')?.indclass
    ).toContain(opclassByName.get('gist_trgm_ops'));

    const extension = scoped.introspection.extensions.find(
      (entity) => entity.extname === 'pg_trgm'
    );
    const extensionNamespace = scoped.introspection.namespaces.find(
      (namespace) => namespace.nspname === EXTENSION_SCHEMA
    );
    expect(extension?.extnamespace).toBe(extensionNamespace?._id);

    expect(
      scoped.introspection.classes.some(
        (entity) => entity.relname === 'unrelated_closure_items_status_idx'
      )
    ).toBe(false);
    expect(
      scoped.introspection.types.some(
        (type) =>
          type.typname === 'item_status' &&
          type.getNamespace()?.nspname === UNRELATED_SCHEMA
      )
    ).toBe(false);
    expect(
      scoped.introspection.procs.some(
        (proc) => proc.getNamespace()?.nspname === UNRELATED_SCHEMA
      )
    ).toBe(false);

    const stockCatalogTypeCount = stock.introspection.types.filter(
      (type) => type.getNamespace()?.nspname === 'pg_catalog'
    ).length;
    const scopedCatalogTypeCount = scoped.introspection.types.filter(
      (type) => type.getNamespace()?.nspname === 'pg_catalog'
    ).length;
    expect(scopedCatalogTypeCount).toBeLessThan(stockCatalogTypeCount);
  });

  it('retains explicitly requested extension capability metadata', async () => {
    const capabilityOnly = await buildSchema(
      pool,
      true,
      [EXTENSION_SCHEMA],
      CAPABILITY_ROOT_SCHEMA
    );
    const namespaceNames = capabilityOnly.introspection.namespaces.map(
      (namespace) => namespace.nspname
    );
    expect(namespaceNames).toEqual(
      expect.arrayContaining([
        CAPABILITY_ROOT_SCHEMA,
        EXTENSION_SCHEMA,
        'pg_catalog',
      ])
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

  it('fails closed when a required dependency schema is not approved', async () => {
    await expect(
      buildSchema(pool, true, [EXTENSION_SCHEMA])
    ).rejects.toThrow(
      `crossed into unapproved dependency schema(s): ${DEPENDENCY_SCHEMA}`
    );
  });
});
