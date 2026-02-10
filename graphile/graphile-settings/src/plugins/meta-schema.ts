/**
 * PostGraphile v5 Meta Schema Plugin
 *
 * Exposes a `_meta` GraphQL query that provides metadata about tables, fields,
 * constraints, and indexes. This is useful for code generation tools that need
 * to understand the database structure.
 *
 * Ported from @constructive-io/graphile-meta-schema (v4) with added index support.
 *
 * This plugin uses the raw graphile-build hooks API to extend the schema,
 * which is compatible with the settings package dependencies.
 */

import type { GraphileConfig } from 'graphile-config';
import {
  GraphQLObjectType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
  GraphQLBoolean,
} from 'graphql';

/**
 * Interface for table metadata
 */
interface TableMeta {
  name: string;
  schemaName: string;
  fields: FieldMeta[];
  indexes: IndexMeta[];
  constraints: ConstraintsMeta;
  inflection: InflectionMeta;
  query: QueryMeta;
}

interface FieldMeta {
  name: string;
  type: TypeMeta;
  isNotNull: boolean;
  hasDefault: boolean;
}

interface TypeMeta {
  pgType: string;
  gqlType: string;
  isArray: boolean;
}

interface IndexMeta {
  name: string;
  isUnique: boolean;
  isPrimary: boolean;
  columns: string[];
}

interface ConstraintsMeta {
  primaryKey: PrimaryKeyConstraintMeta | null;
  unique: UniqueConstraintMeta[];
  foreignKey: ForeignKeyConstraintMeta[];
}

interface PrimaryKeyConstraintMeta {
  name: string;
  fields: FieldMeta[];
}

interface UniqueConstraintMeta {
  name: string;
  fields: FieldMeta[];
}

interface ForeignKeyConstraintMeta {
  name: string;
  fields: FieldMeta[];
  referencedTable: string;
  referencedFields: string[];
}

interface InflectionMeta {
  tableType: string;
  allRows: string;
  connection: string;
  edge: string;
  filterType: string | null;
  orderByType: string;
  conditionType: string;
  patchType: string | null;
  createInputType: string;
  createPayloadType: string;
  updatePayloadType: string | null;
  deletePayloadType: string;
}

interface QueryMeta {
  all: string;
  one: string | null;
  create: string | null;
  update: string | null;
  delete: string | null;
}

// Module-level storage for table metadata (used to pass data between hooks)
// This is necessary because the build object is frozen and cannot be extended
let _cachedTablesMeta: TableMeta[] = [];

/**
 * Creates the meta schema plugin using graphile-build hooks
 */
export const MetaSchemaPlugin: GraphileConfig.Plugin = {
  name: 'MetaSchemaPlugin',
  version: '1.0.0',
  description: 'Exposes _meta query for database schema introspection',

  schema: {
    hooks: {
      init(_, build) {
        const { pgRegistry } = build.input;
        const inflection = build.inflection;
        // Get schemas from build options - cast to any since the type doesn't include pgSchemas
        const schemas: string[] = (build.options as any).pgSchemas || [];

        // Collect all table metadata at build time
        const tablesMeta: TableMeta[] = [];

        for (const resource of Object.values(pgRegistry.pgResources) as any[]) {
          // Skip resources without codec or attributes
          if (!resource.codec?.attributes || resource.codec?.isAnonymous) continue;

          // Safely access extensions - may be undefined for some resources
          const pgExtensions = resource.codec?.extensions?.pg as { schemaName?: string } | undefined;
          const schemaName = pgExtensions?.schemaName;

          // If schemas are specified, filter by them; otherwise include all tables with a schema
          // Skip resources without a schema name (they're not real tables)
          if (!schemaName) continue;
          if (schemas.length > 0 && !schemas.includes(schemaName)) continue;

          const codec = resource.codec;
          const attributes = codec.attributes || {};
          const uniques = resource.uniques || [];
          const relations = resource.relations || {};

          // Build fields metadata
          const fields: FieldMeta[] = Object.entries(attributes).map(([name, attr]: [string, any]) => ({
            name,
            type: {
              pgType: attr.codec?.name || 'unknown',
              gqlType: attr.codec?.name || 'unknown',
              isArray: !!attr.codec?.arrayOfCodec,
            },
            isNotNull: attr.notNull || false,
            hasDefault: attr.hasDefault || false,
          }));

          // Build indexes metadata (from uniques)
          const indexes: IndexMeta[] = uniques.map((unique: any) => ({
            name: unique.tags?.name || `${codec.name}_${unique.attributes.join('_')}_idx`,
            isUnique: true,
            isPrimary: unique.isPrimary || false,
            columns: unique.attributes,
          }));

          // Build constraints metadata
          const primaryUnique = uniques.find((u: any) => u.isPrimary);
          const primaryKey: PrimaryKeyConstraintMeta | null = primaryUnique ? {
            name: primaryUnique.tags?.name || `${codec.name}_pkey`,
            fields: primaryUnique.attributes.map((attrName: string) => {
              const attr = attributes[attrName];
              return {
                name: attrName,
                type: {
                  pgType: attr?.codec?.name || 'unknown',
                  gqlType: attr?.codec?.name || 'unknown',
                  isArray: !!attr?.codec?.arrayOfCodec,
                },
                isNotNull: attr?.notNull || false,
                hasDefault: attr?.hasDefault || false,
              };
            }),
          } : null;

          const uniqueConstraints: UniqueConstraintMeta[] = uniques
            .filter((u: any) => !u.isPrimary)
            .map((u: any) => ({
              name: u.tags?.name || `${codec.name}_${u.attributes.join('_')}_key`,
              fields: u.attributes.map((attrName: string) => {
                const attr = attributes[attrName];
                return {
                  name: attrName,
                  type: {
                    pgType: attr?.codec?.name || 'unknown',
                    gqlType: attr?.codec?.name || 'unknown',
                    isArray: !!attr?.codec?.arrayOfCodec,
                  },
                  isNotNull: attr?.notNull || false,
                  hasDefault: attr?.hasDefault || false,
                };
              }),
            }));

          const foreignKeyConstraints: ForeignKeyConstraintMeta[] = [];
          for (const [relationName, relation] of Object.entries(relations)) {
            const rel = relation as any;
            if (rel.isReferencee === false) {
              foreignKeyConstraints.push({
                name: relationName,
                fields: (rel.localAttributes || []).map((attrName: string) => {
                  const attr = attributes[attrName];
                  return {
                    name: attrName,
                    type: {
                      pgType: attr?.codec?.name || 'unknown',
                      gqlType: attr?.codec?.name || 'unknown',
                      isArray: !!attr?.codec?.arrayOfCodec,
                    },
                    isNotNull: attr?.notNull || false,
                    hasDefault: attr?.hasDefault || false,
                  };
                }),
                referencedTable: rel.remoteResource?.codec?.name || 'unknown',
                referencedFields: rel.remoteAttributes || [],
              });
            }
          }

          const constraints: ConstraintsMeta = {
            primaryKey,
            unique: uniqueConstraints,
            foreignKey: foreignKeyConstraints,
          };

          // Build inflection metadata
          const tableType = inflection.tableType(codec);

          // Helper to safely call inflection methods that may fail for some resources
          const safeInflection = <T>(fn: () => T, fallback: T): T => {
            try {
              return fn() ?? fallback;
            } catch {
              return fallback;
            }
          };

          const inflectionMeta: InflectionMeta = {
            tableType,
            allRows: safeInflection(() => (inflection as any).allRows?.(resource), tableType.toLowerCase() + 's'),
            connection: safeInflection(() => (inflection as any).connectionType?.(tableType), tableType + 'Connection'),
            edge: safeInflection(() => (inflection as any).edgeType?.(tableType), tableType + 'Edge'),
            filterType: safeInflection(() => (inflection as any).filterType?.(tableType), tableType + 'Filter'),
            orderByType: safeInflection(() => (inflection as any).orderByType?.(tableType), tableType + 'OrderBy'),
            conditionType: safeInflection(() => (inflection as any).conditionType?.(tableType), tableType + 'Condition'),
            patchType: safeInflection(() => (inflection as any).patchType?.(tableType), tableType + 'Patch'),
            createInputType: safeInflection(() => (inflection as any).createInputType?.(resource), 'Create' + tableType + 'Input'),
            createPayloadType: safeInflection(() => (inflection as any).createPayloadType?.(resource), 'Create' + tableType + 'Payload'),
            updatePayloadType: safeInflection(() => (inflection as any).updatePayloadType?.(resource), 'Update' + tableType + 'Payload'),
            deletePayloadType: safeInflection(() => (inflection as any).deletePayloadType?.(resource), 'Delete' + tableType + 'Payload'),
          };

          // Build query metadata
          const hasPrimaryKey = uniques.some((u: any) => u.isPrimary);
          const queryMeta: QueryMeta = {
            all: safeInflection(() => (inflection as any).allRows?.(resource), tableType.toLowerCase() + 's'),
            one: hasPrimaryKey ? safeInflection(() => (inflection as any).tableFieldName?.(resource), tableType.toLowerCase()) : null,
            create: safeInflection(() => (inflection as any).createField?.(resource), 'create' + tableType),
            update: hasPrimaryKey ? safeInflection(() => (inflection as any).updateByKeys?.(resource), 'update' + tableType) : null,
            delete: hasPrimaryKey ? safeInflection(() => (inflection as any).deleteByKeys?.(resource), 'delete' + tableType) : null,
          };

          tablesMeta.push({
            name: tableType,
            schemaName,
            fields,
            indexes,
            constraints,
            inflection: inflectionMeta,
            query: queryMeta,
          });
        }

        // Store the metadata in module-level cache for later use by GraphQLObjectType_fields hook
        _cachedTablesMeta = tablesMeta;

        return _;
      },

      GraphQLObjectType_fields(fields, build, context) {
        const { Self } = context;

        // Only extend the Query type
        if (Self.name !== 'Query') {
          return fields;
        }

        const tablesMeta: TableMeta[] = _cachedTablesMeta;

        // Create GraphQL types for the meta schema
        const MetaTypeType = new GraphQLObjectType({
          name: 'MetaType',
          description: 'Information about a PostgreSQL type',
          fields: () => ({
            pgType: { type: new GraphQLNonNull(GraphQLString) },
            gqlType: { type: new GraphQLNonNull(GraphQLString) },
            isArray: { type: new GraphQLNonNull(GraphQLBoolean) },
          }),
        });

        const MetaFieldType = new GraphQLObjectType({
          name: 'MetaField',
          description: 'Information about a table field/column',
          fields: () => ({
            name: { type: new GraphQLNonNull(GraphQLString) },
            type: { type: new GraphQLNonNull(MetaTypeType) },
            isNotNull: { type: new GraphQLNonNull(GraphQLBoolean) },
            hasDefault: { type: new GraphQLNonNull(GraphQLBoolean) },
          }),
        });

        const MetaIndexType = new GraphQLObjectType({
          name: 'MetaIndex',
          description: 'Information about a database index',
          fields: () => ({
            name: { type: new GraphQLNonNull(GraphQLString) },
            isUnique: { type: new GraphQLNonNull(GraphQLBoolean) },
            isPrimary: { type: new GraphQLNonNull(GraphQLBoolean) },
            columns: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLString))) },
          }),
        });

        const MetaPrimaryKeyConstraintType = new GraphQLObjectType({
          name: 'MetaPrimaryKeyConstraint',
          description: 'Information about a primary key constraint',
          fields: () => ({
            name: { type: new GraphQLNonNull(GraphQLString) },
            fields: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(MetaFieldType))) },
          }),
        });

        const MetaUniqueConstraintType = new GraphQLObjectType({
          name: 'MetaUniqueConstraint',
          description: 'Information about a unique constraint',
          fields: () => ({
            name: { type: new GraphQLNonNull(GraphQLString) },
            fields: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(MetaFieldType))) },
          }),
        });

        const MetaForeignKeyConstraintType = new GraphQLObjectType({
          name: 'MetaForeignKeyConstraint',
          description: 'Information about a foreign key constraint',
          fields: () => ({
            name: { type: new GraphQLNonNull(GraphQLString) },
            fields: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(MetaFieldType))) },
            referencedTable: { type: new GraphQLNonNull(GraphQLString) },
            referencedFields: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLString))) },
          }),
        });

        const MetaConstraintsType = new GraphQLObjectType({
          name: 'MetaConstraints',
          description: 'Table constraints',
          fields: () => ({
            primaryKey: { type: MetaPrimaryKeyConstraintType },
            unique: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(MetaUniqueConstraintType))) },
            foreignKey: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(MetaForeignKeyConstraintType))) },
          }),
        });

        const MetaInflectionType = new GraphQLObjectType({
          name: 'MetaInflection',
          description: 'Table inflection names',
          fields: () => ({
            tableType: { type: new GraphQLNonNull(GraphQLString) },
            allRows: { type: new GraphQLNonNull(GraphQLString) },
            connection: { type: new GraphQLNonNull(GraphQLString) },
            edge: { type: new GraphQLNonNull(GraphQLString) },
            filterType: { type: GraphQLString },
            orderByType: { type: new GraphQLNonNull(GraphQLString) },
            conditionType: { type: new GraphQLNonNull(GraphQLString) },
            patchType: { type: GraphQLString },
            createInputType: { type: new GraphQLNonNull(GraphQLString) },
            createPayloadType: { type: new GraphQLNonNull(GraphQLString) },
            updatePayloadType: { type: GraphQLString },
            deletePayloadType: { type: new GraphQLNonNull(GraphQLString) },
          }),
        });

        const MetaQueryType = new GraphQLObjectType({
          name: 'MetaQuery',
          description: 'Table query/mutation names',
          fields: () => ({
            all: { type: new GraphQLNonNull(GraphQLString) },
            one: { type: GraphQLString },
            create: { type: GraphQLString },
            update: { type: GraphQLString },
            delete: { type: GraphQLString },
          }),
        });

        const MetaTableType = new GraphQLObjectType({
          name: 'MetaTable',
          description: 'Information about a database table',
          fields: () => ({
            name: { type: new GraphQLNonNull(GraphQLString) },
            schemaName: { type: new GraphQLNonNull(GraphQLString) },
            fields: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(MetaFieldType))) },
            indexes: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(MetaIndexType))) },
            constraints: { type: new GraphQLNonNull(MetaConstraintsType) },
            inflection: { type: new GraphQLNonNull(MetaInflectionType) },
            query: { type: new GraphQLNonNull(MetaQueryType) },
          }),
        });

        const MetaSchemaType = new GraphQLObjectType({
          name: 'MetaSchema',
          description: 'Root meta schema type',
          fields: () => ({
            tables: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(MetaTableType))) },
          }),
        });

        // Add the _meta field to Query
        return {
          ...fields,
          _meta: {
            type: MetaSchemaType,
            description: 'Metadata about the database schema, including tables, fields, indexes, and constraints. Useful for code generation tools.',
            resolve() {
              return {
                tables: tablesMeta,
              };
            },
          },
        };
      },
    },
  },
};

/**
 * Preset that includes the meta schema plugin
 */
export const MetaSchemaPreset: GraphileConfig.Preset = {
  plugins: [MetaSchemaPlugin],
};

export default MetaSchemaPlugin;
