/**
 * Bm25CodecPlugin
 *
 * Teaches PostGraphile v5 how to handle the pg_textsearch `bm25query` type
 * and discovers BM25 indexes from Graphile's scoped introspection payload.
 *
 * This plugin:
 * 1. Creates a codec for bm25query via gather.hooks.pgCodecs_findPgCodec
 * 2. Discovers requested-schema BM25 indexes without issuing side-channel SQL
 * 3. Attaches index metadata to the exact codec attribute for this build
 */

import 'graphile-build-pg';

import type { GraphileConfig } from 'graphile-config';
import { gatherConfig } from 'graphile-build';
import sql from 'pg-sql2';

type Introspection = Parameters<
  GraphileConfig.GatherHooks['pgIntrospection_introspection']
>[0]['introspection'];

interface ScopedPgService {
  name?: string;
  schemas?: readonly string[];
}

/**
 * Represents a discovered BM25 index in the database.
 */
export interface Bm25IndexInfo {
  /** Graphile PostgreSQL service that owns this index. */
  serviceName: string;
  /** Schema containing pg_textsearch's functions and operators. */
  extensionSchema: string;
  /** Schema name (e.g. 'public') */
  schemaName: string;
  /** Table name (e.g. 'documents') */
  tableName: string;
  /** Column name (e.g. 'content') */
  columnName: string;
  /** Index name (e.g. 'docs_idx') — needed for to_bm25query() */
  indexName: string;
}

declare global {
  namespace GraphileConfig {
    interface GatherHelpers {
      bm25Codec: Record<string, never>;
    }
  }

  namespace DataplanPg {
    interface PgCodecAttributeExtensions {
      /** Exact physical BM25 index bound during this gather generation. */
      bm25Index?: Bm25IndexInfo;
    }
  }
}

const attributeKey = (classId: string, attributeNumber: number): string =>
  `${classId}:${attributeNumber}`;

/** Collect exact requested-schema indexes from this build's own introspection. */
export const collectBm25Indexes = (
  introspection: Introspection,
  schemas: readonly string[],
  serviceName: string
): Map<string, Bm25IndexInfo> => {
  const allowedSchemas = new Set(schemas);
  const discovered = new Map<string, Bm25IndexInfo>();
  const extension = introspection.extensions.find(
    (candidate) => candidate.extname === 'pg_textsearch'
  );
  const extensionNamespace = extension?.extnamespace
    ? introspection.getNamespace({ id: extension.extnamespace })
    : undefined;
  const indexes = [...introspection.indexes].sort((left, right) => {
    const leftName = left.getIndexClass()?.relname ?? '';
    const rightName = right.getIndexClass()?.relname ?? '';
    return leftName.localeCompare(rightName);
  });

  for (const index of indexes) {
    if (index.indisvalid !== true || index.indisready !== true || index.indislive !== true) {
      continue;
    }
    const indexClass = index.getIndexClass();
    const tableClass = index.getClass();
    const namespace = tableClass
      ? introspection.getNamespace({ id: tableClass.relnamespace })
      : undefined;
    if (
      !indexClass
      || indexClass.getAccessMethod()?.amname !== 'bm25'
      || !tableClass
      || !namespace
      || !allowedSchemas.has(namespace.nspname)
    ) {
      continue;
    }

    const keyCount = index.indnkeyatts ?? index.indkey.length;
    for (const attribute of index.getKeys().slice(0, keyCount)) {
      if (!attribute) continue;
      const key = attributeKey(tableClass._id, attribute.attnum);
      if (!extensionNamespace) {
        throw new Error(
          `BM25 index ${namespace.nspname}.${indexClass.relname} has no `
          + 'introspected pg_textsearch extension schema'
        );
      }
      const indexInfo: Bm25IndexInfo = {
        serviceName,
        extensionSchema: extensionNamespace.nspname,
        schemaName: namespace.nspname,
        tableName: tableClass.relname,
        columnName: attribute.attname,
        indexName: indexClass.relname
      };
      const existing = discovered.get(key);
      if (existing && existing.indexName !== indexInfo.indexName) {
        throw new Error(
          `Multiple BM25 indexes target ${indexInfo.schemaName}.${indexInfo.tableName}.` +
          `${indexInfo.columnName}: ${existing.indexName}, ${indexInfo.indexName}`
        );
      }
      discovered.set(key, indexInfo);
    }
  }
  return discovered;
};

export const Bm25CodecPlugin: GraphileConfig.Plugin = {
  name: 'Bm25CodecPlugin',
  version: '1.0.0',
  description: 'Registers a codec for the pg_textsearch bm25query type and discovers BM25 indexes',

  gather: gatherConfig({
    namespace: 'bm25Codec',
    initialState: () => ({
      indexesByService: new Map<string, Map<string, Bm25IndexInfo>>()
    }),
    helpers: {},
    hooks: {
      /**
       * Register the bm25query codec when detected during type introspection.
       */
      async pgCodecs_findPgCodec(info, event) {
        if (event.pgCodec) return;

        const { pgType: type, serviceName } = event;
        if (type.typname !== 'bm25query') return;

        const typeNamespace = await info.helpers.pgIntrospection.getNamespace(
          serviceName,
          type.typnamespace
        );
        if (!typeNamespace) return;

        const schemaName = typeNamespace.nspname;

        event.pgCodec = {
          name: 'bm25query',
          sqlType: sql.identifier(schemaName, 'bm25query'),

          // PG sends bm25query as text
          fromPg(value: string): string {
            return value;
          },

          // string -> bm25query text
          toPg(value: string): string {
            return value;
          },

          attributes: undefined,
          executor: null,
          extensions: {
            oid: type._id,
            pg: { serviceName, schemaName, name: 'bm25query' },
          },
        };
      },

      pgIntrospection_introspection(info, event) {
        const { introspection, serviceName } = event;
        const pgServices = info.resolvedPreset.pgServices as
          | readonly ScopedPgService[]
          | undefined;
        const pgService = pgServices?.find(
          (service) => (service.name ?? 'main') === serviceName
        );
        if (!pgService) throw new Error(`BM25 gather could not find service '${serviceName}'`);
        if (!pgService.schemas?.length) {
          throw new Error(`BM25 gather requires configured schemas for service '${serviceName}'`);
        }
        info.state.indexesByService.set(
          serviceName,
          collectBm25Indexes(introspection, pgService.schemas, serviceName)
        );
      },

      pgCodecs_attribute(info, event) {
        const indexInfo = info.state.indexesByService
          .get(event.serviceName)
          ?.get(attributeKey(event.pgClass._id, event.pgAttribute.attnum));
        if (!indexInfo) return;
        event.attribute.extensions ??= Object.create(null);
        event.attribute.extensions.bm25Index = indexInfo;
      },
    },
  }),

  schema: {
    hooks: {
      init: {
        before: ['PgCodecs'],
        callback(_, build) {
          const { setGraphQLTypeForPgCodec } = build;

          // Map bm25query codec to String for both input and output
          for (const codec of Object.values(build.input.pgRegistry.pgCodecs)) {
            if ((codec as any).name === 'bm25query') {
              setGraphQLTypeForPgCodec(
                codec as any,
                'input',
                build.graphql.GraphQLString.name
              );
              setGraphQLTypeForPgCodec(
                codec as any,
                'output',
                build.graphql.GraphQLString.name
              );
            }
          }

          return _;
        },
      },
    },
  },
};

export const Bm25CodecPreset: GraphileConfig.Preset = {
  plugins: [Bm25CodecPlugin],
};
