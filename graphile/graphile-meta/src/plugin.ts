// Type augmentation: adds the 'schema' property to GraphileConfig.Plugin
import 'graphile-build';

import { withPgClientFromPgService } from 'graphile-build-pg';
import type { GraphileConfig } from 'graphile-config';
import type { GraphQLSchema } from 'graphql';

import { allowedValuesForAttribute } from './check-constraint-values';
import { isGeneratedColumn } from './column-defaults';
import { extendQueryWithMetaField } from './graphql-meta-field';
import { collectTablesMeta } from './table-meta-builder';
import type { MetaBuild, TableMeta } from './types';

declare global {
  namespace DataplanPg {
    interface PgCodecAttributeExtensions {
      /** Values permitted by the column's simple CHECK constraints. */
      allowedValues?: string[];
      /**
       * The database generates the column's value: identity, a generated
       * column, or a non-constant default such as `now()` or serial's
       * `nextval(...)`.
       */
      generatedValue?: boolean;
    }
  }
}

// pg_attrdef.adbin of each table's defaulted columns, by attnum, read once per
// introspection.
const columnDefaultsByClass = new WeakMap<object, Map<number, string>>();

type PgService = Parameters<typeof withPgClientFromPgService>[0];

const COLUMN_DEFAULTS_QUERY = `
  select adrelid::text as adrelid, adnum, adbin::text as adbin
  from pg_catalog.pg_attrdef
  where adrelid = any($1::oid[])
`;

const runtimeTablesBySchema = new WeakMap<GraphQLSchema, TableMeta[]>();

function getRuntimeTablesMeta(
  build: MetaBuild,
  schema: GraphQLSchema
): TableMeta[] {
  let tables = runtimeTablesBySchema.get(schema);
  if (!tables) {
    tables = collectTablesMeta(build, schema);
    runtimeTablesBySchema.set(schema, tables);
  }
  return tables;
}

/**
 * Returns the table metadata memoized for the given executable schema, or
 * `undefined` if `_meta` has not been resolved against that schema (e.g. the
 * meta plugin is disabled or `_meta` was never executed).
 */
export function getTablesMetaForSchema(
  schema: GraphQLSchema
): TableMeta[] | undefined {
  return runtimeTablesBySchema.get(schema);
}

export const MetaSchemaPlugin: GraphileConfig.Plugin = {
  name: 'MetaSchemaPlugin',
  version: '1.0.0',
  description: 'Exposes _meta query for database schema introspection',
  gather: {
    hooks: {
      // Read the default expression of every defaulted column, which the
      // introspection doesn't carry, so pgCodecs_attribute can tell a
      // generated value from a constant default.
      async pgIntrospection_introspection(info, event) {
        const { introspection, serviceName } = event;
        const pgServices: readonly PgService[] | undefined = info.resolvedPreset.pgServices;
        const pgService = pgServices?.find((service) => service.name === serviceName);
        const relids = [
          ...new Set(
            introspection.attributes
              .filter((attribute) => attribute.atthasdef)
              .map((attribute) => attribute.attrelid)
          ),
        ];
        if (!pgService || relids.length === 0) return;
        const { rows } = await withPgClientFromPgService(
          pgService,
          pgService.pgSettingsForIntrospection ?? null,
          (client) =>
            client.query<{ adrelid: string; adnum: number; adbin: string }>({
              text: COLUMN_DEFAULTS_QUERY,
              values: [relids],
            })
        );
        const classes = new Map(
          introspection.classes.map((pgClass) => [pgClass._id, pgClass])
        );
        for (const { adrelid, adnum, adbin } of rows) {
          const pgClass = classes.get(adrelid);
          if (!pgClass) continue;
          let defaults = columnDefaultsByClass.get(pgClass);
          if (!defaults) {
            defaults = new Map();
            columnDefaultsByClass.set(pgClass, defaults);
          }
          defaults.set(adnum, adbin);
        }
      },
      // Record each column's CHECK-constraint values, and whether the database
      // generates its value, on the codec attribute, where _meta reads them.
      pgCodecs_attribute(_info, event) {
        const { pgClass, pgAttribute, attribute } = event;
        const allowedValues = allowedValuesForAttribute(
          pgClass.getConstraints(),
          pgAttribute.attnum
        );
        const generatedValue = isGeneratedColumn(
          pgAttribute,
          columnDefaultsByClass.get(pgClass)?.get(pgAttribute.attnum)
        );
        if (!allowedValues && !generatedValue) return;
        attribute.extensions = {
          ...attribute.extensions,
          ...(allowedValues && { allowedValues }),
          ...(generatedValue && { generatedValue }),
        };
      },
    },
  },
  schema: {
    hooks: {
      GraphQLObjectType_fields(rawFields, rawBuild, rawContext) {
        if (!rawContext.scope.isRootQuery) return rawFields;
        const build = rawBuild as unknown as MetaBuild;
        return extendQueryWithMetaField(
          rawFields as unknown as Record<string, unknown>,
          (schema) => getRuntimeTablesMeta(build, schema),
        ) as typeof rawFields;
      },
    },
  },
};
