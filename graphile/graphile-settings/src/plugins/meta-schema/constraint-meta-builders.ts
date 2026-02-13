import { buildFieldMeta } from './type-mappings';
import { buildFieldList, type BuildContext } from './table-meta-context';
import type {
  ForeignKeyConstraintMeta,
  PgAttribute,
  PgCodec,
  PgRelation,
  PgUnique,
  PrimaryKeyConstraintMeta,
  UniqueConstraintMeta,
} from './types';

export function buildForeignKeyConstraint(
  constraintName: string,
  localCodec: PgCodec,
  localAttributes: Record<string, PgAttribute>,
  localAttributeNames: string[],
  remoteCodec: PgCodec | undefined,
  remoteAttributes: Record<string, PgAttribute>,
  remoteAttributeNames: string[],
  context: BuildContext,
): ForeignKeyConstraintMeta {
  const referencedTable = remoteCodec?.name || 'unknown';
  const referencedFields = remoteAttributeNames.map((attrName) =>
    remoteCodec ? context.inflectAttr(attrName, remoteCodec) : attrName,
  );

  return {
    name: constraintName,
    fields: buildFieldList(localAttributeNames, localCodec, localAttributes, context),
    referencedTable,
    referencedFields,
    refFields: remoteAttributeNames.map((attrName) =>
      buildFieldMeta(
        remoteCodec ? context.inflectAttr(attrName, remoteCodec) : attrName,
        remoteAttributes[attrName],
        context.build,
      ),
    ),
    refTable: { name: referencedTable },
  };
}

export function buildIndexes(
  codec: PgCodec,
  attributes: Record<string, PgAttribute>,
  uniques: PgUnique[],
  context: BuildContext,
) {
  return uniques.map((unique) => ({
    name: unique.tags?.name || `${codec.name}_${unique.attributes.join('_')}_idx`,
    isUnique: true,
    isPrimary: !!unique.isPrimary,
    columns: unique.attributes.map((attrName) => context.inflectAttr(attrName, codec)),
    fields: buildFieldList(unique.attributes, codec, attributes, context),
  }));
}

export function buildPrimaryKey(
  codec: PgCodec,
  attributes: Record<string, PgAttribute>,
  uniques: PgUnique[],
  context: BuildContext,
): PrimaryKeyConstraintMeta | null {
  const primaryUnique = uniques.find((unique) => unique.isPrimary);
  if (!primaryUnique) return null;

  return {
    name: primaryUnique.tags?.name || `${codec.name}_pkey`,
    fields: buildFieldList(primaryUnique.attributes, codec, attributes, context),
  };
}

export function buildUniqueConstraints(
  codec: PgCodec,
  attributes: Record<string, PgAttribute>,
  uniques: PgUnique[],
  context: BuildContext,
): UniqueConstraintMeta[] {
  return uniques
    .filter((unique) => !unique.isPrimary)
    .map((unique) => ({
      name: unique.tags?.name || `${codec.name}_${unique.attributes.join('_')}_key`,
      fields: buildFieldList(unique.attributes, codec, attributes, context),
    }));
}

export function buildForeignKeyConstraints(
  codec: PgCodec,
  attributes: Record<string, PgAttribute>,
  relations: Record<string, PgRelation>,
  context: BuildContext,
): ForeignKeyConstraintMeta[] {
  const constraints: ForeignKeyConstraintMeta[] = [];

  for (const [relationName, relation] of Object.entries(relations)) {
    if (relation.isReferencee !== false) continue;

    const remoteCodec = relation.remoteResource?.codec;
    const remoteAttributes = remoteCodec?.attributes || {};
    constraints.push(
      buildForeignKeyConstraint(
        relationName,
        codec,
        attributes,
        relation.localAttributes || [],
        remoteCodec,
        remoteAttributes,
        relation.remoteAttributes || [],
        context,
      ),
    );
  }

  return constraints;
}
