import {
  GraphQLBoolean,
  type GraphQLFieldConfig,
  GraphQLFloat,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  type GraphQLOutputType,
  GraphQLString
} from 'graphql';

import type { TableMeta } from './types';

type FieldMap = Record<string, unknown>;

function nn<T extends GraphQLOutputType>(type: T): GraphQLNonNull<T> {
  return new GraphQLNonNull(type);
}

function nnList<T extends GraphQLOutputType>(
  type: T
): GraphQLNonNull<GraphQLList<GraphQLNonNull<T>>> {
  return nn(new GraphQLList(nn(type)));
}

function createMetaSchemaType(): GraphQLObjectType {
  const MetaTypeType = new GraphQLObjectType({
    name: 'MetaType',
    description: 'Information about a PostgreSQL type',
    fields: () => ({
      pgType: { type: nn(GraphQLString) },
      gqlType: { type: nn(GraphQLString) },
      isArray: { type: nn(GraphQLBoolean) },
      isNotNull: { type: GraphQLBoolean },
      hasDefault: { type: GraphQLBoolean },
      subtype: { type: GraphQLString }
    })
  });

  const MetaEnumType = new GraphQLObjectType({
    name: 'MetaEnum',
    description: 'Information about a PostgreSQL enum type',
    fields: () => ({
      name: { type: nn(GraphQLString), description: 'The PostgreSQL enum type name' },
      values: { type: nnList(GraphQLString), description: 'Allowed values for this enum' }
    })
  });

  const MetaFieldType = new GraphQLObjectType({
    name: 'MetaField',
    description: 'Information about a table field/column',
    fields: () => ({
      name: { type: nn(GraphQLString) },
      type: { type: nn(MetaTypeType) },
      isNotNull: { type: nn(GraphQLBoolean) },
      hasDefault: { type: nn(GraphQLBoolean) },
      isPrimaryKey: { type: nn(GraphQLBoolean) },
      isForeignKey: { type: nn(GraphQLBoolean) },
      description: { type: GraphQLString },
      enumValues: { type: MetaEnumType, description: 'Enum metadata if this field has an enum type' }
    })
  });

  const MetaIndexType = new GraphQLObjectType({
    name: 'MetaIndex',
    description: 'Information about a database index',
    fields: () => ({
      name: { type: nn(GraphQLString) },
      isUnique: { type: nn(GraphQLBoolean) },
      isPrimary: { type: nn(GraphQLBoolean) },
      columns: { type: nnList(GraphQLString) },
      fields: { type: new GraphQLList(nn(MetaFieldType)) }
    })
  });

  const MetaPrimaryKeyConstraintType = new GraphQLObjectType({
    name: 'MetaPrimaryKeyConstraint',
    description: 'Information about a primary key constraint',
    fields: () => ({
      name: { type: nn(GraphQLString) },
      fields: { type: nnList(MetaFieldType) }
    })
  });

  const MetaUniqueConstraintType = new GraphQLObjectType({
    name: 'MetaUniqueConstraint',
    description: 'Information about a unique constraint',
    fields: () => ({
      name: { type: nn(GraphQLString) },
      fields: { type: nnList(MetaFieldType) }
    })
  });

  const MetaRefTableType = new GraphQLObjectType({
    name: 'MetaRefTable',
    description: 'Reference to a related table',
    fields: () => ({
      name: { type: nn(GraphQLString) }
    })
  });

  const MetaForeignKeyConstraintType = new GraphQLObjectType({
    name: 'MetaForeignKeyConstraint',
    description: 'Information about a foreign key constraint',
    fields: () => ({
      name: { type: nn(GraphQLString) },
      fields: { type: nnList(MetaFieldType) },
      referencedTable: { type: nn(GraphQLString) },
      referencedFields: { type: nnList(GraphQLString) },
      refFields: { type: new GraphQLList(nn(MetaFieldType)) },
      refTable: { type: MetaRefTableType }
    })
  });

  const MetaConstraintsType = new GraphQLObjectType({
    name: 'MetaConstraints',
    description: 'Table constraints',
    fields: () => ({
      primaryKey: { type: MetaPrimaryKeyConstraintType },
      unique: { type: nnList(MetaUniqueConstraintType) },
      foreignKey: { type: nnList(MetaForeignKeyConstraintType) }
    })
  });

  const MetaInflectionType = new GraphQLObjectType({
    name: 'MetaInflection',
    description: 'Table inflection names',
    fields: () => ({
      tableType: { type: nn(GraphQLString) },
      allRows: { type: nn(GraphQLString) },
      connection: { type: nn(GraphQLString) },
      edge: { type: nn(GraphQLString) },
      filterType: { type: GraphQLString },
      orderByType: { type: nn(GraphQLString) },
      conditionType: { type: nn(GraphQLString) },
      patchType: { type: GraphQLString },
      createInputType: { type: nn(GraphQLString) },
      createPayloadType: { type: nn(GraphQLString) },
      updatePayloadType: { type: GraphQLString },
      deletePayloadType: { type: nn(GraphQLString) }
    })
  });

  const MetaQueryType = new GraphQLObjectType({
    name: 'MetaQuery',
    description: 'Table query/mutation names',
    fields: () => ({
      all: { type: nn(GraphQLString) },
      one: { type: GraphQLString },
      create: { type: GraphQLString },
      update: { type: GraphQLString },
      delete: { type: GraphQLString }
    })
  });

  const MetaBelongsToRelationType = new GraphQLObjectType({
    name: 'MetaBelongsToRelation',
    description: 'A belongs-to (forward FK) relation',
    fields: () => ({
      fieldName: { type: GraphQLString },
      isUnique: { type: nn(GraphQLBoolean) },
      type: { type: GraphQLString },
      keys: { type: nnList(MetaFieldType) },
      references: { type: nn(MetaRefTableType) }
    })
  });

  const MetaHasRelationType = new GraphQLObjectType({
    name: 'MetaHasRelation',
    description: 'A has-one or has-many (reverse FK) relation',
    fields: () => ({
      fieldName: { type: GraphQLString },
      isUnique: { type: nn(GraphQLBoolean) },
      type: { type: GraphQLString },
      keys: { type: nnList(MetaFieldType) },
      referencedBy: { type: nn(MetaRefTableType) }
    })
  });

  const MetaManyToManyRelationType = new GraphQLObjectType({
    name: 'MetaManyToManyRelation',
    description: 'A many-to-many relation via junction table',
    fields: () => ({
      fieldName: { type: GraphQLString },
      type: { type: GraphQLString },
      junctionTable: { type: nn(MetaRefTableType) },
      junctionLeftConstraint: { type: nn(MetaForeignKeyConstraintType) },
      junctionLeftKeyAttributes: { type: nnList(MetaFieldType) },
      junctionRightConstraint: { type: nn(MetaForeignKeyConstraintType) },
      junctionRightKeyAttributes: { type: nnList(MetaFieldType) },
      leftKeyAttributes: { type: nnList(MetaFieldType) },
      rightKeyAttributes: { type: nnList(MetaFieldType) },
      rightTable: { type: nn(MetaRefTableType) }
    })
  });

  const MetaRelationsType = new GraphQLObjectType({
    name: 'MetaRelations',
    description: 'Table relations',
    fields: () => ({
      belongsTo: { type: nnList(MetaBelongsToRelationType) },
      has: { type: nnList(MetaHasRelationType) },
      hasOne: { type: nnList(MetaHasRelationType) },
      hasMany: { type: nnList(MetaHasRelationType) },
      manyToMany: { type: nnList(MetaManyToManyRelationType) }
    })
  });

  const MetaStorageType = new GraphQLObjectType({
    name: 'MetaStorage',
    description: 'Storage metadata for a table',
    fields: () => ({
      isFilesTable: { type: nn(GraphQLBoolean), description: 'Whether this table is a storage files table' },
      isBucketsTable: { type: nn(GraphQLBoolean), description: 'Whether this table is a storage buckets table' }
    })
  });

  const MetaSearchConfigType = new GraphQLObjectType({
    name: 'MetaSearchConfig',
    description: 'Per-table search configuration from @searchConfig smart tag',
    fields: () => ({
      weights: {
        type: GraphQLString,
        description: 'JSON-encoded per-adapter score weights',
        resolve(source: any) {
          return source.weights ? JSON.stringify(source.weights) : null;
        }
      },
      boostRecent: { type: nn(GraphQLBoolean), description: 'Whether recency boosting is enabled' },
      boostRecencyField: { type: GraphQLString, description: 'Field used for recency decay' },
      boostRecencyDecay: { type: GraphQLFloat, description: 'Exponential decay factor per day' }
    })
  });

  const MetaSearchColumnType = new GraphQLObjectType({
    name: 'MetaSearchColumn',
    description: 'A searchable column with its algorithm',
    fields: () => ({
      name: { type: nn(GraphQLString), description: 'Column name (camelCase)' },
      algorithm: { type: nn(GraphQLString), description: 'Search algorithm: tsvector, bm25, trgm, or vector' }
    })
  });

  const MetaSearchType = new GraphQLObjectType({
    name: 'MetaSearch',
    description: 'Search metadata for a table',
    fields: () => ({
      algorithms: { type: nnList(GraphQLString), description: 'Active search algorithms on this table' },
      columns: { type: nnList(MetaSearchColumnType), description: 'Searchable columns with their algorithm' },
      hasUnifiedSearch: { type: nn(GraphQLBoolean), description: 'Whether unifiedSearch composite filter is available' },
      config: { type: MetaSearchConfigType, description: 'Per-table search configuration' }
    })
  });

  const MetaI18nFieldType = new GraphQLObjectType({
    name: 'MetaI18nField',
    description: 'A translatable field',
    fields: () => ({
      name: { type: nn(GraphQLString), description: 'GraphQL field name' },
      type: { type: nn(GraphQLString), description: 'PostgreSQL column type (text, citext)' }
    })
  });

  const MetaI18nType = new GraphQLObjectType({
    name: 'MetaI18n',
    description: 'i18n metadata for a table with @i18n tag',
    fields: () => ({
      translationTable: { type: nn(GraphQLString), description: 'Name of the translation table' },
      translatableFields: { type: nnList(MetaI18nFieldType), description: 'Fields that are translatable' }
    })
  });

  const MetaRealtimeType = new GraphQLObjectType({
    name: 'MetaRealtime',
    description: 'Realtime metadata for a table with @realtime tag',
    fields: () => ({
      subscriptionFieldName: { type: nn(GraphQLString), description: 'The generated subscription field name (e.g. onPostChanged)' }
    })
  });

  const MetaScopeType = new GraphQLObjectType({
    name: 'MetaScope',
    description: 'Provisioning scope metadata for a table',
    fields: () => ({
      scope: { type: nn(GraphQLString), description: "Provisioning scope: 'platform', 'app', 'database', or an entity scope (e.g. 'org')" },
      tier: { type: nn(GraphQLString), description: "Coarse bucket: 'global', 'database', or 'entity'" },
      keyColumn: { type: GraphQLString, description: 'Inflected scope key column (e.g. databaseId, orgId), null for global tiers' },
      entityTable: { type: GraphQLString, description: 'SQL name of the entity table for entity scopes, else null' },
      source: { type: nn(GraphQLString), description: "How scope was determined: 'smartTag' (@scope) or 'inferred' (columns)" }
    })
  });

  const MetaTableType = new GraphQLObjectType({
    name: 'MetaTable',
    description: 'Information about a database table',
    fields: () => ({
      name: { type: nn(GraphQLString) },
      schemaName: { type: nn(GraphQLString) },
      fields: { type: nnList(MetaFieldType) },
      indexes: { type: nnList(MetaIndexType) },
      constraints: { type: nn(MetaConstraintsType) },
      foreignKeyConstraints: { type: nnList(MetaForeignKeyConstraintType) },
      primaryKeyConstraints: { type: nnList(MetaPrimaryKeyConstraintType) },
      uniqueConstraints: { type: nnList(MetaUniqueConstraintType) },
      relations: { type: nn(MetaRelationsType) },
      inflection: { type: nn(MetaInflectionType) },
      query: { type: nn(MetaQueryType) },
      storage: { type: MetaStorageType, description: 'Storage metadata (null if not a storage table)' },
      search: { type: MetaSearchType, description: 'Search metadata (null if no search configured)' },
      i18n: { type: MetaI18nType, description: 'i18n metadata (null if no @i18n tag)' },
      realtime: { type: MetaRealtimeType, description: 'Realtime metadata (null if no @realtime tag)' },
      scope: { type: MetaScopeType, description: 'Provisioning scope metadata (null if no @scope tag and not inferrable)' }
    })
  });

  return new GraphQLObjectType({
    name: 'MetaSchema',
    description: 'Root meta schema type',
    fields: () => ({
      tables: { type: nnList(MetaTableType) }
    })
  });
}

export function extendQueryWithMetaField(
  fields: FieldMap,
  tablesMeta: TableMeta[]
): FieldMap {
  const metaSchemaType = createMetaSchemaType();
  const metaField: GraphQLFieldConfig<unknown, unknown> = {
    type: metaSchemaType,
    description:
      'Metadata about the database schema, including tables, fields, indexes, and constraints. Useful for code generation tools.',
    resolve() {
      return { tables: tablesMeta };
    }
  };

  return {
    ...fields,
    _meta: metaField
  };
}
