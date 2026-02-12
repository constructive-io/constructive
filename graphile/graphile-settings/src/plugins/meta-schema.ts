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
  foreignKeyConstraints: ForeignKeyConstraintMeta[];
  primaryKeyConstraints: PrimaryKeyConstraintMeta[];
  uniqueConstraints: UniqueConstraintMeta[];
  relations: RelationsMeta;
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
  isNotNull?: boolean;
  hasDefault?: boolean;
}

interface IndexMeta {
  name: string;
  isUnique: boolean;
  isPrimary: boolean;
  columns: string[];
  fields: FieldMeta[];
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
  refFields: FieldMeta[];
  refTable: { name: string };
}

interface RelationsMeta {
  belongsTo: BelongsToRelation[];
  has: HasRelation[];
  hasOne: HasRelation[];
  hasMany: HasRelation[];
  manyToMany: ManyToManyRelation[];
}

interface BelongsToRelation {
  fieldName: string | null;
  isUnique: boolean;
  type: string | null;
  keys: FieldMeta[];
  references: { name: string };
}

interface HasRelation {
  fieldName: string | null;
  isUnique: boolean;
  type: string | null;
  keys: FieldMeta[];
  referencedBy: { name: string };
}

interface ManyToManyRelation {
  fieldName: string | null;
  type: string | null;
  junctionTable: { name: string };
  junctionLeftConstraint: ForeignKeyConstraintMeta;
  junctionLeftKeyAttributes: FieldMeta[];
  junctionRightConstraint: ForeignKeyConstraintMeta;
  junctionRightKeyAttributes: FieldMeta[];
  leftKeyAttributes: FieldMeta[];
  rightKeyAttributes: FieldMeta[];
  rightTable: { name: string };
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

/** Map PostgreSQL type names to their GraphQL equivalents */
const PG_TO_GQL_TYPE: Record<string, string> = {
  text: 'String', varchar: 'String', char: 'String', name: 'String', bpchar: 'String',
  uuid: 'UUID',
  int2: 'Int', int4: 'Int', integer: 'Int',
  int8: 'BigInt', bigint: 'BigInt',
  float4: 'Float', float8: 'Float', numeric: 'BigFloat',
  bool: 'Boolean', boolean: 'Boolean',
  timestamptz: 'Datetime', timestamp: 'Datetime',
  date: 'Date', time: 'Time', timetz: 'Time',
  json: 'JSON', jsonb: 'JSON',
  interval: 'Interval',
  point: 'Point', geometry: 'GeoJSON', geography: 'GeoJSON',
  inet: 'InternetAddress', cidr: 'InternetAddress',
  xml: 'String', bytea: 'String', macaddr: 'String',
};

function pgTypeToGqlType(pgTypeName: string): string {
  return PG_TO_GQL_TYPE[pgTypeName] || pgTypeName;
}

/**
 * Resolve a PG codec to a GraphQL type, preferring PostGraphile's runtime map
 * and falling back to local PG->GQL mapping when unavailable.
 */
function resolveGqlTypeName(build: any, codec: any): string {
  if (!codec) return 'unknown';

  try {
    const codecForLookup = codec.arrayOfCodec || codec;
    if (build?.hasGraphQLTypeForPgCodec?.(codecForLookup, 'output')) {
      const resolved = build.getGraphQLTypeNameByPgCodec(codecForLookup, 'output');
      if (resolved) return resolved;
    }
  } catch {
    // Fall through to static fallback mapping.
  }

  const pgTypeName = codec.name || 'unknown';
  const mapped = pgTypeToGqlType(pgTypeName);
  if (mapped !== pgTypeName) return mapped;

  const nestedTypeName = codec.arrayOfCodec?.name;
  return nestedTypeName ? pgTypeToGqlType(nestedTypeName) : pgTypeName;
}

/** Build a FieldMeta from an attribute name and attribute object */
function buildFieldMeta(name: string, attr: any, build?: any): FieldMeta {
  const pgType = attr?.codec?.name || 'unknown';
  return {
    name,
    type: {
      pgType,
      gqlType: build ? resolveGqlTypeName(build, attr?.codec) : pgTypeToGqlType(pgType),
      isArray: !!attr?.codec?.arrayOfCodec,
      isNotNull: attr?.notNull || false,
      hasDefault: attr?.hasDefault || false,
    },
    isNotNull: attr?.notNull || false,
    hasDefault: attr?.hasDefault || false,
  };
}

/** Build an FK constraint meta from a relation and local attributes */
function buildFkConstraintMeta(
  relationName: string,
  rel: any,
  localAttributes: Record<string, any>,
  inflectAttr: (attrName: string, codec: any) => string,
  localCodec: any,
  build?: any,
): ForeignKeyConstraintMeta {
  const remoteCodec = rel.remoteResource?.codec;
  const remoteAttrs = remoteCodec?.attributes || {};
  return {
    name: relationName,
    fields: (rel.localAttributes || []).map((attrName: string) =>
      buildFieldMeta(inflectAttr(attrName, localCodec), localAttributes[attrName], build),
    ),
    referencedTable: rel.remoteResource?.codec?.name || 'unknown',
    referencedFields: (rel.remoteAttributes || []).map((attrName: string) =>
      inflectAttr(attrName, remoteCodec),
    ),
    refFields: (rel.remoteAttributes || []).map((attrName: string) =>
      buildFieldMeta(inflectAttr(attrName, remoteCodec), remoteAttrs[attrName], build),
    ),
    refTable: { name: rel.remoteResource?.codec?.name || 'unknown' },
  };
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

        // Helper to safely call inflection methods that may fail for some resources
        const safeInflection = <T>(fn: () => T, fallback: T): T => {
          try {
            return fn() ?? fallback;
          } catch {
            return fallback;
          }
        };

        // Helper to inflect a PG attribute name to its GraphQL field name
        const inflectAttr = (attrName: string, codec: any): string => {
          const attributeName = safeInflection(
            () => (inflection as any)._attributeName?.({ attributeName: attrName, codec }),
            attrName,
          );
          return safeInflection(
            () => (inflection as any).camelCase?.(attributeName),
            attributeName,
          );
        };

        // Deduplicate: pgResources can have multiple entries per codec
        const seenCodecs = new Set<any>();

        for (const resource of Object.values(pgRegistry.pgResources) as any[]) {
          // Skip resources without codec or attributes
          if (!resource.codec?.attributes || resource.codec?.isAnonymous) continue;
          // Skip non-table resources (unique lookups, virtual resources, functions)
          if (resource.parameters || resource.isVirtual || resource.isUnique) continue;

          // Deduplicate by codec — multiple resources can share the same codec
          if (seenCodecs.has(resource.codec)) continue;
          seenCodecs.add(resource.codec);

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

          // Build fields metadata with inflected names
          const fields: FieldMeta[] = Object.entries(attributes).map(
            ([attrName, attr]: [string, any]) =>
              buildFieldMeta(inflectAttr(attrName, codec), attr, build),
          );

          // Build indexes metadata (from uniques)
          const indexes: IndexMeta[] = uniques.map((unique: any) => ({
            name: unique.tags?.name || `${codec.name}_${unique.attributes.join('_')}_idx`,
            isUnique: true,
            isPrimary: unique.isPrimary || false,
            columns: unique.attributes.map((a: string) => inflectAttr(a, codec)),
            fields: unique.attributes.map((attrName: string) =>
              buildFieldMeta(inflectAttr(attrName, codec), attributes[attrName], build),
            ),
          }));

          // Build constraints metadata
          const primaryUnique = uniques.find((u: any) => u.isPrimary);
          const primaryKey: PrimaryKeyConstraintMeta | null = primaryUnique
            ? {
                name: primaryUnique.tags?.name || `${codec.name}_pkey`,
                fields: primaryUnique.attributes.map((attrName: string) =>
                  buildFieldMeta(inflectAttr(attrName, codec), attributes[attrName], build),
                ),
              }
            : null;

          const uniqueConstraints: UniqueConstraintMeta[] = uniques
            .filter((u: any) => !u.isPrimary)
            .map((u: any) => ({
              name: u.tags?.name || `${codec.name}_${u.attributes.join('_')}_key`,
              fields: u.attributes.map((attrName: string) =>
                buildFieldMeta(inflectAttr(attrName, codec), attributes[attrName], build),
              ),
            }));

          const foreignKeyConstraints: ForeignKeyConstraintMeta[] = [];
          for (const [relationName, relation] of Object.entries(relations)) {
            const rel = relation as any;
            if (rel.isReferencee === false) {
              foreignKeyConstraints.push(
                buildFkConstraintMeta(relationName, rel, attributes, inflectAttr, codec, build),
              );
            }
          }

          const constraints: ConstraintsMeta = {
            primaryKey,
            unique: uniqueConstraints,
            foreignKey: foreignKeyConstraints,
          };

          // Build relations metadata
          const belongsTo: BelongsToRelation[] = [];
          const hasOne: HasRelation[] = [];
          const hasMany: HasRelation[] = [];

          for (const [relationName, relation] of Object.entries(relations)) {
            const rel = relation as any;
            if (rel.isReferencee === false) {
              // Forward FK = belongsTo
              const isUnique = uniques.some(
                (u: any) =>
                  u.attributes.length === (rel.localAttributes || []).length &&
                  u.attributes.every((a: string) => (rel.localAttributes || []).includes(a)),
              );
              belongsTo.push({
                fieldName: relationName,
                isUnique,
                type: rel.remoteResource?.codec?.name || null,
                keys: (rel.localAttributes || []).map((attrName: string) =>
                  buildFieldMeta(inflectAttr(attrName, codec), attributes[attrName], build),
                ),
                references: { name: rel.remoteResource?.codec?.name || 'unknown' },
              });
            } else if (rel.isReferencee === true) {
              // Reverse FK
              const remoteUniques = rel.remoteResource?.uniques || [];
              const isUnique = remoteUniques.some(
                (u: any) =>
                  u.attributes.length === (rel.remoteAttributes || []).length &&
                  u.attributes.every((a: string) => (rel.remoteAttributes || []).includes(a)),
              );
              const hasRelation: HasRelation = {
                fieldName: relationName,
                isUnique,
                type: rel.remoteResource?.codec?.name || null,
                keys: (rel.localAttributes || []).map((attrName: string) =>
                  buildFieldMeta(inflectAttr(attrName, codec), attributes[attrName], build),
                ),
                referencedBy: { name: rel.remoteResource?.codec?.name || 'unknown' },
              };
              if (isUnique) {
                hasOne.push(hasRelation);
              } else {
                hasMany.push(hasRelation);
              }
            }
          }

          const relationsMeta: RelationsMeta = {
            belongsTo,
            has: [...hasOne, ...hasMany],
            hasOne,
            hasMany,
            manyToMany: [], // TODO: detect from PostGraphile manyToManyRelations if available
          };

          // Build inflection metadata
          const tableType = inflection.tableType(codec);

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
            foreignKeyConstraints,
            primaryKeyConstraints: primaryKey ? [primaryKey] : [],
            uniqueConstraints,
            relations: relationsMeta,
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
            isNotNull: { type: GraphQLBoolean },
            hasDefault: { type: GraphQLBoolean },
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
            fields: { type: new GraphQLList(new GraphQLNonNull(MetaFieldType)) },
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

        const MetaRefTableType = new GraphQLObjectType({
          name: 'MetaRefTable',
          description: 'Reference to a related table',
          fields: () => ({
            name: { type: new GraphQLNonNull(GraphQLString) },
          }),
        });

        const MetaForeignKeyConstraintType: GraphQLObjectType = new GraphQLObjectType({
          name: 'MetaForeignKeyConstraint',
          description: 'Information about a foreign key constraint',
          fields: () => ({
            name: { type: new GraphQLNonNull(GraphQLString) },
            fields: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(MetaFieldType))) },
            referencedTable: { type: new GraphQLNonNull(GraphQLString) },
            referencedFields: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLString))) },
            refFields: { type: new GraphQLList(new GraphQLNonNull(MetaFieldType)) },
            refTable: { type: MetaRefTableType },
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

        // Relation types
        const MetaBelongsToRelationType = new GraphQLObjectType({
          name: 'MetaBelongsToRelation',
          description: 'A belongs-to (forward FK) relation',
          fields: () => ({
            fieldName: { type: GraphQLString },
            isUnique: { type: new GraphQLNonNull(GraphQLBoolean) },
            type: { type: GraphQLString },
            keys: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(MetaFieldType))) },
            references: { type: new GraphQLNonNull(MetaRefTableType) },
          }),
        });

        const MetaHasRelationType = new GraphQLObjectType({
          name: 'MetaHasRelation',
          description: 'A has-one or has-many (reverse FK) relation',
          fields: () => ({
            fieldName: { type: GraphQLString },
            isUnique: { type: new GraphQLNonNull(GraphQLBoolean) },
            type: { type: GraphQLString },
            keys: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(MetaFieldType))) },
            referencedBy: { type: new GraphQLNonNull(MetaRefTableType) },
          }),
        });

        const MetaManyToManyRelationType = new GraphQLObjectType({
          name: 'MetaManyToManyRelation',
          description: 'A many-to-many relation via junction table',
          fields: () => ({
            fieldName: { type: GraphQLString },
            type: { type: GraphQLString },
            junctionTable: { type: new GraphQLNonNull(MetaRefTableType) },
            junctionLeftConstraint: { type: new GraphQLNonNull(MetaForeignKeyConstraintType) },
            junctionLeftKeyAttributes: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(MetaFieldType))) },
            junctionRightConstraint: { type: new GraphQLNonNull(MetaForeignKeyConstraintType) },
            junctionRightKeyAttributes: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(MetaFieldType))) },
            leftKeyAttributes: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(MetaFieldType))) },
            rightKeyAttributes: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(MetaFieldType))) },
            rightTable: { type: new GraphQLNonNull(MetaRefTableType) },
          }),
        });

        const MetaRelationsType = new GraphQLObjectType({
          name: 'MetaRelations',
          description: 'Table relations',
          fields: () => ({
            belongsTo: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(MetaBelongsToRelationType))) },
            has: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(MetaHasRelationType))) },
            hasOne: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(MetaHasRelationType))) },
            hasMany: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(MetaHasRelationType))) },
            manyToMany: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(MetaManyToManyRelationType))) },
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
            foreignKeyConstraints: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(MetaForeignKeyConstraintType))) },
            primaryKeyConstraints: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(MetaPrimaryKeyConstraintType))) },
            uniqueConstraints: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(MetaUniqueConstraintType))) },
            relations: { type: new GraphQLNonNull(MetaRelationsType) },
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

/** @internal Exported for testing only */
export { pgTypeToGqlType as _pgTypeToGqlType };
export { buildFieldMeta as _buildFieldMeta };
export { _cachedTablesMeta };

export default MetaSchemaPlugin;
