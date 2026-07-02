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
import { buildStorageMeta, buildSearchMeta, buildI18nMeta, buildRealtimeMeta } from './storage-search-meta-builders';
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

  const fields = Object.entries(attributes).map(([attrName, attr]) =>
    buildFieldMeta(context.inflectAttr(attrName, codec), attr, context.build, {
      isPrimaryKey: pkAttrNames.has(attrName),
      isForeignKey: fkAttrNames.has(attrName),
    }),
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

  const storage = buildStorageMeta(codec);
  const search = buildSearchMeta(codec, context.build, context.inflectAttr);
  const i18n = buildI18nMeta(codec, context.build, context.inflectAttr);
  const realtime = buildRealtimeMeta(codec, context.build);

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
    storage,
    search,
    i18n,
    realtime,
  };
}

/**
 * Strip the tenant hash prefix (`<dashed-dbname>-<8hex>-`) from a physical
 * schema name, returning the logical name; names without a hash segment are
 * returned unchanged. Local duplicate of the server-side helper to avoid a
 * cross-package dependency.
 */
function stripSchemaHashPrefix(name: string): string {
  const match = /-[0-9a-f]{8}-/.exec(name);
  if (!match) return name;
  return name.slice(match.index + match[0].length);
}

export function collectTablesMeta(build: MetaBuild): TableMeta[] {
  const configuredSchemas = getConfiguredSchemas(build);
  const context = createBuildContext(build);
  const seenCodecs = new Set<PgCodec>();
  const tablesMeta: TableMeta[] = [];
  // Shared (pooled) instances serve many tenants: reporting the build-time
  // PHYSICAL schema name would leak the representative tenant's hashed schema
  // identifier to every other tenant via _meta — report the logical name.
  const unqualified = !!(build.options as any)?.constructiveUnqualified;

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

    tablesMeta.push(
      buildTableMeta(resource, unqualified ? stripSchemaHashPrefix(schemaName) : schemaName, context)
    );
  }

  return tablesMeta;
}
