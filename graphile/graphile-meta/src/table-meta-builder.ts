import { getNamedType, type GraphQLSchema } from 'graphql';

import {
  buildForeignKeyConstraints,
  buildIndexes,
  buildPrimaryKey,
  buildUniqueConstraints
} from './constraint-meta-builders';
import { getFieldContainerType } from './graphql-schema-utils';
import { buildInflectionMeta, buildQueryMeta, resolveTableType } from './name-meta-builders';
import {
  buildBelongsToRelations,
  buildManyToManyRelations,
  buildReverseRelations
} from './relation-meta-builders';
import { buildScopeMeta } from './scope-meta-builders';
import { buildI18nMeta, buildRealtimeMeta,buildSearchMeta, buildStorageMeta } from './storage-search-meta-builders';
import {
  type BuildContext,
  createBuildContext,
  type TableResourceWithCodec
} from './table-meta-context';
import {
  getConfiguredSchemas,
  getRelations,
  getSchemaName,
  getUniques,
  isTableResource
} from './table-resource-utils';
import { buildFieldMeta } from './type-mappings';
import type {
  ConstraintsMeta,
  MetaBuild,
  PgCodec,
  RelationsMeta,
  TableMeta
} from './types';

function buildTableMeta(
  resource: TableResourceWithCodec,
  schemaName: string,
  context: BuildContext
): TableMeta | null {
  const codec = resource.codec;
  const attributes = codec.attributes;
  const uniques = getUniques(resource);
  const relations = getRelations(resource);
  const tableType = resolveTableType(context.build, codec);
  const finalTableType = context.schema
    ? getFieldContainerType(context.schema, tableType)
    : null;
  if (context.schema && !finalTableType) return null;

  // Compute PK and FK attribute name sets for field metadata
  const pkAttrNames = new Set<string>();
  const fkAttrNames = new Set<string>();
  for (const unique of uniques) {
    if (unique.isPrimary) {
      for (const attrName of unique.attributes) pkAttrNames.add(attrName);
    }
  }
  for (const relation of Object.values(relations)) {
    if (relation.isReferencee) continue;
    for (const attrName of relation.localAttributes || []) fkAttrNames.add(attrName);
  }

  const fields = Object.entries(attributes).flatMap(([attrName, attr]) => {
    if (
      context.schema &&
      context.build.behavior?.pgCodecAttributeMatches &&
      !context.build.behavior.pgCodecAttributeMatches(
        [codec, attrName],
        'attribute:select'
      )
    ) {
      return [];
    }

    const fieldName = context.inflectAttr(attrName, codec);
    const fieldMeta = buildFieldMeta(fieldName, attr, context.build, {
      columnName: attrName,
      isPrimaryKey: pkAttrNames.has(attrName),
      isForeignKey: fkAttrNames.has(attrName)
    });

    if (finalTableType) {
      const finalField = finalTableType.getFields()[fieldName];
      if (!finalField) return [];

      const finalTypeName = getNamedType(finalField.type).name;
      const codecForLookup = attr.codec?.arrayOfCodec || attr.codec;
      let registeredTypeName: string | null | undefined;
      try {
        if (
          codecForLookup &&
          context.build.hasGraphQLTypeForPgCodec?.(codecForLookup, 'output')
        ) {
          registeredTypeName =
            context.build.getGraphQLTypeNameByPgCodec?.(
              codecForLookup,
              'output'
            );
        }
      } catch {
        registeredTypeName = null;
      }
      if (registeredTypeName && registeredTypeName !== finalTypeName) {
        return [];
      }

      fieldMeta.type.gqlType = finalTypeName;
    }

    return [fieldMeta];
  });
  const indexes = buildIndexes(codec, attributes, uniques, context);
  const primaryKey = buildPrimaryKey(codec, attributes, uniques, context);
  const uniqueConstraints = buildUniqueConstraints(codec, attributes, uniques, context);
  const foreignKeyConstraints = buildForeignKeyConstraints(
    codec,
    attributes,
    relations,
    context
  );

  const constraints: ConstraintsMeta = {
    primaryKey,
    unique: uniqueConstraints,
    foreignKey: foreignKeyConstraints
  };

  const belongsTo = buildBelongsToRelations(codec, attributes, uniques, relations, context);
  const { hasOne, hasMany } = buildReverseRelations(codec, attributes, relations, context);
  const manyToMany = buildManyToManyRelations(resource, codec, context);

  const relationsMeta: RelationsMeta = {
    belongsTo,
    has: [...hasOne, ...hasMany],
    hasOne,
    hasMany,
    manyToMany
  };

  const storage = buildStorageMeta(codec);
  const search = buildSearchMeta(codec, context.build, context.inflectAttr);
  const i18n = buildI18nMeta(codec, context.build, context.inflectAttr);
  const realtime = buildRealtimeMeta(codec, context.build);
  const scope = buildScopeMeta(codec, context.inflectAttr);

  const query = buildQueryMeta(
    resource,
    uniques,
    tableType,
    context.build,
    context.schema
  );

  return {
    name: tableType,
    tableName: codec.extensions?.pg?.name ?? codec.name,
    schemaName,
    fields,
    indexes,
    constraints,
    foreignKeyConstraints,
    primaryKeyConstraints: primaryKey ? [primaryKey] : [],
    uniqueConstraints,
    relations: relationsMeta,
    inflection: buildInflectionMeta(resource, tableType, context.build, query),
    query,
    storage,
    search,
    i18n,
    realtime,
    scope
  };
}

export function collectTablesMeta(
  build: MetaBuild,
  schema?: GraphQLSchema
): TableMeta[] {
  const configuredSchemas = getConfiguredSchemas(build);
  const context = createBuildContext(build, schema);
  const seenCodecs = new Set<PgCodec>();
  const tablesMeta: TableMeta[] = [];

  for (const resource of Object.values(build.input.pgRegistry.pgResources || {})) {
    if (!isTableResource(resource)) continue;

    const codec = resource.codec;
    if (seenCodecs.has(codec)) continue;
    seenCodecs.add(codec);

    const schemaName = getSchemaName(resource);
    if (!schemaName) continue;
    if (
      configuredSchemas.length > 0 &&
      !configuredSchemas.includes(schemaName)
    ) {
      continue;
    }

    const tableMeta = buildTableMeta(resource, schemaName, context);
    if (tableMeta) tablesMeta.push(tableMeta);
  }

  return tablesMeta;
}
