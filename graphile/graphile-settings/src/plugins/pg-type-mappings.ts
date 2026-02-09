import type { GraphileConfig } from 'graphile-config';
import { GraphQLString } from 'graphql';
import sql from 'pg-sql2';

/**
 * Type mapping configuration for custom PostgreSQL types.
 */
export interface TypeMapping {
  /** PostgreSQL type name */
  name: string;
  /** PostgreSQL schema/namespace name */
  namespaceName: string;
  /** GraphQL type to map to */
  type: 'String';
}

/**
 * Default type mappings for common custom PostgreSQL types.
 * These are typically domain types or composite types that should be
 * represented as simple scalars in GraphQL.
 */
const DEFAULT_MAPPINGS: TypeMapping[] = [
  { name: 'email', namespaceName: 'public', type: 'String' },
  { name: 'hostname', namespaceName: 'public', type: 'String' },
  { name: 'origin', namespaceName: 'public', type: 'String' },
  { name: 'url', namespaceName: 'public', type: 'String' },
];

/**
 * Plugin that maps custom PostgreSQL types to GraphQL scalar types.
 *
 * This is useful for domain types or composite types that should be
 * represented as simple scalars (String, JSON) in the GraphQL API.
 *
 * For example, if you have:
 *   CREATE DOMAIN email AS text;
 *   CREATE TYPE url AS (value text);
 *
 * This plugin will map them to GraphQL String type instead of creating
 * complex object types.
 *
 * The plugin handles both:
 * 1. Domain types (simple aliases) - maps directly to the target scalar
 * 2. Composite types - extracts the first field's value when converting from PG
 */
export const PgTypeMappingsPlugin: GraphileConfig.Plugin = {
  name: 'PgTypeMappingsPlugin',
  version: '1.0.0',

  gather: {
    hooks: {
      async pgCodecs_findPgCodec(info, event) {
        if (event.pgCodec) {
          return;
        }

        const { pgType: type, serviceName } = event;

        // Find the namespace for this type
        const namespace = await info.helpers.pgIntrospection.getNamespace(
          serviceName,
          type.typnamespace
        );

        if (!namespace) {
          return;
        }

        // Check if this type matches any of our mappings
        const mapping = DEFAULT_MAPPINGS.find(
          m => m.name === type.typname && m.namespaceName === namespace.nspname
        );

        if (!mapping) {
          return;
        }

        // Create a codec for this type
        // For composite types, the fromPg function extracts the first field's value
        // For domain types, it just passes through the value
        event.pgCodec = {
          name: type.typname,
          sqlType: sql.identifier(namespace.nspname, type.typname),
          fromPg: (value: unknown) => {
            if (value == null) {
              return null;
            }
            // If it's already a scalar, return it
            if (typeof value !== 'object' || Array.isArray(value)) {
              return value;
            }
            // For composite types, extract the first field's value
            const obj = value as Record<string, unknown>;
            const keys = Object.keys(obj);
            if (keys.length > 0) {
              return obj[keys[0]];
            }
            return value;
          },
          toPg: (value: unknown) => value as string,
          attributes: undefined,
          executor: null,
          extensions: {
            oid: type._id,
            pg: {
              serviceName,
              schemaName: namespace.nspname,
              name: type.typname,
            },
            tags: {
              // Mark this as a custom mapped type
              pgTypeMappings: mapping.type,
            },
          },
        };
      },
    },
  },

  schema: {
    hooks: {
      init(_, build) {
        const { setGraphQLTypeForPgCodec } = build;

        // Map our custom codecs to GraphQL types
        for (const codec of Object.values(build.input.pgRegistry.pgCodecs)) {
          const mappingType = codec.extensions?.tags?.pgTypeMappings as string | undefined;
          if (mappingType) {
            const gqlTypeName = GraphQLString.name;
            setGraphQLTypeForPgCodec(codec, 'input', gqlTypeName);
            setGraphQLTypeForPgCodec(codec, 'output', gqlTypeName);
          }
        }

        return _;
      },
    },
  },
};

/**
 * Preset that includes the PG type mappings plugin.
 *
 * This preset maps common custom PostgreSQL types to GraphQL scalars:
 * - email -> String
 * - hostname -> String
 * - url -> String
 * - origin -> String
 */
export const PgTypeMappingsPreset: GraphileConfig.Preset = {
  plugins: [PgTypeMappingsPlugin],
};

export default PgTypeMappingsPlugin;
