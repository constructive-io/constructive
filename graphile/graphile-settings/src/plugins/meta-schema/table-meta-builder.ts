import {
  buildForeignKeyConstraints,
  buildIndexes,
  buildPrimaryKey,
  buildUniqueConstraints,
} from './constraint-meta-builders';
import { buildInflectionMeta, buildQueryMeta, resolveTableType } from './name-meta-builders';
import {
  buildBelongsToRelations,
  buildManyToManyRelations,
  buildReverseRelations,
} from './relation-meta-builders';
import { buildFieldMeta } from './type-mappings';
import {
  createBuildContext,
  type BuildContext,
  type TableResourceWithCodec,
} from './table-meta-context';
import {
  getConfiguredSchemas,
  getRelations,
  getSchemaName,
  getUniques,
  isTableResource,
} from './table-resource-utils';
import type {
  ConstraintsMeta,
  MetaBuild,
  PgCodec,
  TableMeta,
  RelationsMeta,
} from './types';

function buildTableMeta(
  resource: TableResourceWithCodec,
  schemaName: string,
  context: BuildContext,
): TableMeta {
  const codec = resource.codec;
  const attributes = codec.attributes;
  const uniques = getUniques(resource);
  const relations = getRelations(resource);

  const fields = Object.entries(attributes).map(([attrName, attr]) =>
    buildFieldMeta(context.inflectAttr(attrName, codec), attr, context.build),
  );
  const indexes = buildIndexes(codec, attributes, uniques, context);
  const primaryKey = buildPrimaryKey(codec, attributes, uniques, context);
  const uniqueConstraints = buildUniqueConstraints(codec, attributes, uniques, context);
  const foreignKeyConstraints = buildForeignKeyConstraints(
    codec,
    attributes,
    relations,
    context,
  );

  const constraints: ConstraintsMeta = {
    primaryKey,
    unique: uniqueConstraints,
    foreignKey: foreignKeyConstraints,
  };

  const belongsTo = buildBelongsToRelations(codec, attributes, uniques, relations, context);
  const { hasOne, hasMany } = buildReverseRelations(codec, attributes, relations, context);
  const manyToMany = buildManyToManyRelations(resource, codec, context);

  const relationsMeta: RelationsMeta = {
    belongsTo,
    has: [...hasOne, ...hasMany],
    hasOne,
    hasMany,
    manyToMany,
  };

  const tableType = resolveTableType(context.build, codec);

  return {
    name: tableType,
    schemaName,
    fields,
    indexes,
    constraints,
    foreignKeyConstraints,
    primaryKeyConstraints: primaryKey ? [primaryKey] : [],
    uniqueConstraints,
    relations: relationsMeta,
    inflection: buildInflectionMeta(resource, tableType, context.build),
    query: buildQueryMeta(resource, uniques, tableType, context.build),
  };
}

export function collectTablesMeta(build: MetaBuild): TableMeta[] {
  const configuredSchemas = getConfiguredSchemas(build);
  const context = createBuildContext(build);
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

    tablesMeta.push(buildTableMeta(resource, schemaName, context));
  }

  return tablesMeta;
}
