import { safeInflection } from './inflection-utils';
import {
  buildForeignKeyConstraint,
} from './constraint-meta-builders';
import {
  findExecutableField,
  getFieldContainerType,
} from './graphql-schema-utils';
import { resolveTableType } from './name-meta-builders';
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

function resolveDirectRelationField(
  relationName: string,
  relation: PgRelation,
  isUnique: boolean,
  codec: PgCodec,
  remoteCodec: PgCodec,
  context: BuildContext,
): { name: string; typeName: string } | null {
  if (!context.schema) return null;

  const build = context.build;
  const details = {
    registry: build.input.pgRegistry,
    codec,
    relationName,
  };
  const parentType = getFieldContainerType(
    context.schema,
    resolveTableType(build, codec),
  );
  const remoteTypeName = resolveTableType(build, remoteCodec);
  const candidates = [];

  if (!relation.isReferencee) {
    candidates.push({
      name: safeInflection(
        () => build.inflection.singleRelation?.(details),
        null,
      ),
      typeName: remoteTypeName,
    });
  } else if (isUnique) {
    candidates.push({
      name: safeInflection(
        () => build.inflection.singleRelationBackwards?.(details),
        null,
      ),
      typeName: remoteTypeName,
    });
  }

  const connectionTypeName = safeInflection(
    () => build.inflection.tableConnectionType?.(remoteCodec),
    `${remoteTypeName}Connection`,
  );
  candidates.push(
    {
      name: safeInflection(
        () => build.inflection.manyRelationConnection?.(details),
        null,
      ),
      typeName: connectionTypeName,
    },
    {
      name: safeInflection(
        () => build.inflection.manyRelationList?.(details),
        null,
      ),
      typeName: remoteTypeName,
    },
  );

  return findExecutableField(parentType, candidates);
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
    // PostGraphile only sets isReferencee when true (reverse FK);
    // forward relations have isReferencee undefined, not false.
    if (relation.isReferencee) continue;

    const localAttributes = relation.localAttributes || [];
    const isUnique = uniques.some((unique) =>
      sameAttributes(unique.attributes, localAttributes),
    );

    const remoteCodec = relation.remoteResource?.codec;

    if (context.schema && !remoteCodec) continue;
    const executable = remoteCodec
      ? resolveDirectRelationField(
          relationName,
          relation,
          isUnique,
          codec,
          remoteCodec,
          context,
        )
      : null;
    if (context.schema && !executable) continue;
    const remoteTypeName = remoteCodec
      ? resolveTableType(context.build, remoteCodec)
      : null;

    belongsTo.push({
      fieldName: executable?.name ?? relationName,
      isUnique,
      type: executable?.typeName ?? remoteCodec?.name ?? null,
      keys: buildFieldList(localAttributes, codec, attributes, context),
      references: {
        name: context.schema
          ? remoteTypeName || 'unknown'
          : remoteCodec?.name || 'unknown',
      },
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

    const isUnique =
      relation.isUnique ??
      getUniques(relation.remoteResource || {}).some((unique) =>
        sameAttributes(unique.attributes, relation.remoteAttributes || []),
      );

    const remoteCodec = relation.remoteResource?.codec;

    if (context.schema && !remoteCodec) continue;
    const executable = remoteCodec
      ? resolveDirectRelationField(
          relationName,
          relation,
          isUnique,
          codec,
          remoteCodec,
          context,
        )
      : null;
    if (context.schema && !executable) continue;
    const remoteTypeName = remoteCodec
      ? resolveTableType(context.build, remoteCodec)
      : null;

    const meta: HasRelation = {
      fieldName: executable?.name ?? relationName,
      isUnique,
      type: executable?.typeName ?? remoteCodec?.name ?? null,
      keys: buildFieldList(relation.localAttributes || [], codec, attributes, context),
      referencedBy: {
        name: context.schema
          ? remoteTypeName || 'unknown'
          : remoteCodec?.name || 'unknown',
      },
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

  const leftTypeName = resolveTableType(context.build, leftCodec);
  const junctionTypeName = resolveTableType(context.build, junctionCodec);
  const rightTypeName = resolveTableType(context.build, rightCodec);
  const executable = context.schema
    ? findExecutableField(getFieldContainerType(context.schema, leftTypeName), [
        {
          name: safeInflection(
            () =>
              context.build.inflection.manyToManyRelationConnectionField?.(
                details
              ),
            null,
          ),
          typeName: safeInflection(
            () =>
              context.build.inflection.manyToManyRelationConnectionType?.({
                ...details,
                leftTableTypeName: leftTypeName,
              }),
            null,
          ),
        },
        {
          name: safeInflection(
            () =>
              context.build.inflection.manyToManyRelationListField?.(details),
            null,
          ),
          typeName: rightTypeName,
        },
      ])
    : null;
  if (context.schema && !executable) return null;

  const leftRelation = getRelation(details.leftTable, details.leftRelationName);
  const junctionRightRelation = getRelation(details.junctionTable, details.rightRelationName);
  if (!leftRelation || !junctionRightRelation) return null;

  const leftJunctionAttributes = leftRelation.remoteAttributes || [];
  const leftTableAttributes = leftRelation.localAttributes || [];
  const rightJunctionAttributes = junctionRightRelation.localAttributes || [];
  const rightTableAttributes = junctionRightRelation.remoteAttributes || [];

  const relationFieldName =
    executable?.name ??
    safeInflection(
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

  if (context.schema) {
    junctionLeftConstraint.referencedTable = leftTypeName;
    junctionLeftConstraint.refTable.name = leftTypeName;
    junctionRightConstraint.referencedTable = rightTypeName;
    junctionRightConstraint.refTable.name = rightTypeName;
  }

  return {
    fieldName: relationFieldName,
    type: executable?.typeName ?? rightCodec.name ?? null,
    junctionTable: {
      name: context.schema ? junctionTypeName : junctionCodec.name || 'unknown',
    },
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
    rightTable: {
      name: context.schema ? rightTypeName : rightCodec.name || 'unknown',
    },
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
