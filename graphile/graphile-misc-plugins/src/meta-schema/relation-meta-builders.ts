import { safeInflection } from './inflection-utils';
import {
  buildForeignKeyConstraint,
} from './constraint-meta-builders';
import { buildFieldList, type BuildContext } from './table-meta-context';
import {
  getRelation,
  getResourceCodec,
  getUniques,
  sameAttributes,
} from './table-resource-utils';
import type {
  BelongsToRelation,
  HasRelation,
  ManyToManyRelation,
  MetaBuild,
  PgAttribute,
  PgCodec,
  PgManyToManyRelationDetails,
  PgRelation,
  PgTableResource,
  PgUnique,
} from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function buildBelongsToRelations(
  codec: PgCodec,
  attributes: Record<string, PgAttribute>,
  uniques: PgUnique[],
  relations: Record<string, PgRelation>,
  context: BuildContext,
): BelongsToRelation[] {
  const belongsTo: BelongsToRelation[] = [];

  for (const [relationName, relation] of Object.entries(relations)) {
    if (relation.isReferencee !== false) continue;

    const localAttributes = relation.localAttributes || [];
    const isUnique = uniques.some((unique) =>
      sameAttributes(unique.attributes, localAttributes),
    );

    belongsTo.push({
      fieldName: relationName,
      isUnique,
      type: relation.remoteResource?.codec?.name || null,
      keys: buildFieldList(localAttributes, codec, attributes, context),
      references: { name: relation.remoteResource?.codec?.name || 'unknown' },
    });
  }

  return belongsTo;
}

export function buildReverseRelations(
  codec: PgCodec,
  attributes: Record<string, PgAttribute>,
  relations: Record<string, PgRelation>,
  context: BuildContext,
): { hasOne: HasRelation[]; hasMany: HasRelation[] } {
  const hasOne: HasRelation[] = [];
  const hasMany: HasRelation[] = [];

  for (const [relationName, relation] of Object.entries(relations)) {
    if (relation.isReferencee !== true) continue;

    const remoteUniques = getUniques(relation.remoteResource || {});
    const remoteAttributes = relation.remoteAttributes || [];
    const isUnique = remoteUniques.some((unique) =>
      sameAttributes(unique.attributes, remoteAttributes),
    );

    const meta: HasRelation = {
      fieldName: relationName,
      isUnique,
      type: relation.remoteResource?.codec?.name || null,
      keys: buildFieldList(relation.localAttributes || [], codec, attributes, context),
      referencedBy: { name: relation.remoteResource?.codec?.name || 'unknown' },
    };

    if (isUnique) {
      hasOne.push(meta);
    } else {
      hasMany.push(meta);
    }
  }

  return { hasOne, hasMany };
}

function isManyToManyDetails(value: unknown): value is PgManyToManyRelationDetails {
  if (!isRecord(value)) return false;
  return (
    isRecord(value.leftTable) &&
    isRecord(value.junctionTable) &&
    isRecord(value.rightTable) &&
    typeof value.leftRelationName === 'string' &&
    typeof value.rightRelationName === 'string'
  );
}

function parseManyToManyRelationships(value: unknown): PgManyToManyRelationDetails[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isManyToManyDetails);
}

function getManyToManyRelationships(
  build: MetaBuild,
  tableResource: PgTableResource,
  codec: PgCodec,
): PgManyToManyRelationDetails[] {
  const relationshipsByResource = build.pgManyToManyRealtionshipsByResource;
  if (!(relationshipsByResource instanceof Map)) return [];

  const direct = parseManyToManyRelationships(relationshipsByResource.get(tableResource));
  if (direct.length > 0) return direct;

  for (const [leftTable, relationships] of relationshipsByResource.entries()) {
    const details = parseManyToManyRelationships(relationships);
    if (details.length === 0 || !isRecord(leftTable)) continue;
    if ((leftTable as PgTableResource).codec === codec) {
      return details;
    }
  }

  return [];
}

function buildManyToManyRelation(
  details: PgManyToManyRelationDetails,
  context: BuildContext,
): ManyToManyRelation | null {
  const leftCodec = getResourceCodec(details.leftTable);
  const junctionCodec = getResourceCodec(details.junctionTable);
  const rightCodec = getResourceCodec(details.rightTable);
  if (!leftCodec || !junctionCodec || !rightCodec) return null;

  const leftRelation = getRelation(details.leftTable, details.leftRelationName);
  const junctionRightRelation = getRelation(details.junctionTable, details.rightRelationName);
  if (!leftRelation || !junctionRightRelation) return null;

  const leftJunctionAttributes = leftRelation.remoteAttributes || [];
  const leftTableAttributes = leftRelation.localAttributes || [];
  const rightJunctionAttributes = junctionRightRelation.localAttributes || [];
  const rightTableAttributes = junctionRightRelation.remoteAttributes || [];

  const relationFieldName = safeInflection(
    () => context.build.inflection._manyToManyRelation?.(details),
    details.rightRelationName || rightCodec.name || null,
  );

  const junctionLeftConstraint = buildForeignKeyConstraint(
    details.leftRelationName || `${junctionCodec.name}_${leftCodec.name}_fkey`,
    junctionCodec,
    junctionCodec.attributes,
    leftJunctionAttributes,
    leftCodec,
    leftCodec.attributes,
    leftTableAttributes,
    context,
  );

  const junctionRightConstraint = buildForeignKeyConstraint(
    details.rightRelationName || `${junctionCodec.name}_${rightCodec.name}_fkey`,
    junctionCodec,
    junctionCodec.attributes,
    rightJunctionAttributes,
    rightCodec,
    rightCodec.attributes,
    rightTableAttributes,
    context,
  );

  return {
    fieldName: relationFieldName,
    type: rightCodec.name || null,
    junctionTable: { name: junctionCodec.name || 'unknown' },
    junctionLeftConstraint,
    junctionLeftKeyAttributes: buildFieldList(
      leftJunctionAttributes,
      junctionCodec,
      junctionCodec.attributes,
      context,
    ),
    junctionRightConstraint,
    junctionRightKeyAttributes: buildFieldList(
      rightJunctionAttributes,
      junctionCodec,
      junctionCodec.attributes,
      context,
    ),
    leftKeyAttributes: buildFieldList(
      leftTableAttributes,
      leftCodec,
      leftCodec.attributes,
      context,
    ),
    rightKeyAttributes: buildFieldList(
      rightTableAttributes,
      rightCodec,
      rightCodec.attributes,
      context,
    ),
    rightTable: { name: rightCodec.name || 'unknown' },
  };
}

export function buildManyToManyRelations(
  resource: PgTableResource,
  codec: PgCodec,
  context: BuildContext,
): ManyToManyRelation[] {
  return getManyToManyRelationships(context.build, resource, codec)
    .map((details) => buildManyToManyRelation(details, context))
    .filter((relation): relation is ManyToManyRelation => relation !== null);
}
