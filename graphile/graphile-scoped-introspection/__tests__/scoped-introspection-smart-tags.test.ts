import { createHash } from 'node:crypto';
import { join } from 'node:path';

import {
  defaultPreset as graphileBuildPreset,
  makeSchema,
} from 'graphile-build';
import { defaultPreset as graphileBuildPgPreset } from 'graphile-build-pg';
import type { GraphileConfig } from 'graphile-config';
import {
  getNamedType,
  type GraphQLSchema,
  isEnumType,
  lexicographicSortSchema,
  parse,
  printSchema,
} from 'graphql';
import type { Introspection } from 'pg-introspection';
import { getConnections, type PgTestClient, seed } from 'pgsql-test';

const { withPgClientFromPgService } = require('postgraphile/@dataplan/pg') as {
  withPgClientFromPgService: (...args: readonly unknown[]) => unknown;
};
const { execute } = require('postgraphile/grafast') as {
  execute(options: {
    schema: GraphQLSchema;
    document: ReturnType<typeof parse>;
    resolvedPreset: GraphileConfig.ResolvedPreset;
    contextValue: Record<string, unknown>;
  }): Promise<{ data?: Record<string, unknown> | null; errors?: readonly unknown[] }>;
};
const { makePgService } = require('postgraphile/adaptors/pg') as {
  makePgService(
    options: Record<string, unknown>
  ): GraphileConfig.PgServiceConfiguration;
};

import { ScopedIntrospectionPreset } from '../src';

const ROOT_SCHEMA = 'smart_tag_root';

interface SchemaBuild {
  schema: GraphQLSchema;
  resolvedPreset: GraphileConfig.ResolvedPreset;
  service: GraphileConfig.PgServiceConfiguration;
  introspection: Introspection;
  hash: string;
}

const capture = (
  onIntrospection: (introspection: Introspection) => void
): GraphileConfig.Plugin => ({
  name: 'SmartTagIntrospectionCapturePlugin',
  gather: {
    namespace: 'smartTagIntrospectionCapture' as const,
    hooks: {
      pgIntrospection_introspection(
        _info: unknown,
        event: { introspection: Introspection }
      ) {
        onIntrospection(event.introspection);
      },
    },
  },
}) as unknown as GraphileConfig.Plugin;

// graphile-build-pg resolves @foreignKey smart tags by name on every
// introspected class and fails the whole build when a target is missing, so
// scoped introspection must retain tables reached only through those tags.
describe('schema-scoped introspection with @foreignKey smart tags', () => {
  let teardown: (() => Promise<void>) | undefined;
  let pool: ReturnType<Awaited<ReturnType<typeof getConnections>>['manager']['getPool']>;
  let pg: PgTestClient;
  let db: PgTestClient;
  const services: GraphileConfig.PgServiceConfiguration[] = [];
  let stock: SchemaBuild;
  let scoped: SchemaBuild;

  const buildSchema = async (scopedIntrospection: boolean): Promise<SchemaBuild> => {
    let introspection: Introspection | undefined;
    const service = makePgService({ pool, schemas: [ROOT_SCHEMA], pubsub: false });
    services.push(service);
    const result = await makeSchema({
      extends: [graphileBuildPreset, graphileBuildPgPreset, ScopedIntrospectionPreset],
      ...(scopedIntrospection
        ? { gather: { pgScopedIntrospection: { [String(service.name)]: true } } }
        : {}),
      plugins: [capture((value) => { introspection = value; })],
      pgServices: [service as never],
    });
    if (!introspection) {
      throw new Error('PostgreSQL introspection lifecycle event was not emitted');
    }
    const sdl = printSchema(lexicographicSortSchema(result.schema));
    return {
      schema: result.schema,
      resolvedPreset: result.resolvedPreset,
      service,
      introspection,
      hash: createHash('sha256').update(sdl).digest('hex'),
    };
  };

  beforeAll(async () => {
    const connections = await getConnections({}, [
      seed.sqlfile([join(__dirname, 'fixtures', 'scoped-introspection-smart-tags.sql')]),
    ]);
    pg = connections.pg;
    db = connections.db;
    teardown = connections.teardown;
    pool = connections.manager.getPool(connections.pg.config);
    stock = await buildSchema(false);
    scoped = await buildSchema(true);
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

  it('builds the same schema as stock introspection', () => {
    expect(scoped.hash).toBe(stock.hash);
  });

  it('retains tag targets, including quoted, upper-case and transitive ones', () => {
    const retained = (introspection: Introspection) =>
      introspection.classes
        .filter((entity) => entity.relkind === 'r')
        .map((entity) => `${entity.getNamespace()?.nspname}.${entity.relname}`)
        .sort();

    expect(retained(scoped.introspection)).toEqual([
      'Smart_Tag_Prüfung.approvers',
      'Smart_Tag_Quoted.Reviewers',
      'smart_tag_hidden.owners',
      'smart_tag_hidden.priority',
      'smart_tag_root.tickets',
      'smart_tag_transitive.teams',
    ]);
    // Tag-like lines after description text or after a blank line are
    // description, not tags.
    expect(
      scoped.introspection.namespaces.map((namespace) => namespace.nspname)
    ).not.toContain('smart_tag_unrelated');
  });

  it('exposes the tag-referenced @enum table as an enum column', async () => {
    const queryFields = scoped.schema.getQueryType()!.getFields();
    const ticketsField = 'allTickets';
    if (!queryFields[ticketsField]) {
      throw new Error(`Tickets connection field was not generated; query fields: ${Object.keys(queryFields).join(', ')}`);
    }
    const ticketType = scoped.schema.getType('Ticket');
    const priority = ticketType && 'getFields' in ticketType
      ? ticketType.getFields().priority
      : undefined;
    const priorityType = priority ? getNamedType(priority.type) : undefined;
    expect(
      isEnumType(priorityType)
        ? priorityType.getValues().map((value) => value.name)
        : priorityType?.toString()
    ).toEqual(['normal', 'urgent']);

    const result = await execute({
      schema: scoped.schema,
      document: parse(`{ ${ticketsField} { nodes { priority } } }`),
      resolvedPreset: scoped.resolvedPreset,
      contextValue: {
        [scoped.service.pgSettingsKey!]: {},
        [scoped.service.withPgClientKey!]: withPgClientFromPgService.bind(null, scoped.service),
      },
    });
    expect(result.errors).toBeUndefined();
    // grafast's execute() returns the enum's internal value (the table row).
    expect(result.data?.[ticketsField]).toEqual({ nodes: [{ priority: 'urgent' }] });
  });
});
