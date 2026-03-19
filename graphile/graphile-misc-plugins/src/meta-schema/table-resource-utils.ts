import type {
  MetaBuild,
  PgAttribute,
  PgCodec,
  PgRelation,
  PgTableResource,
  PgUnique,
} from './types';
import type { TableResourceWithCodec } from './table-meta-context';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isTableResource(
  resource: PgTableResource,
): resource is TableResourceWithCodec {
  return (
    !!resource.codec &&
    !resource.codec.isAnonymous &&
    isRecord(resource.codec.attributes) &&
    !resource.parameters &&
    !resource.isVirtual &&
    !resource.isUnique
  );
}

export function getSchemaName(resource: PgTableResource): string | null {
  const schemaName = resource.codec?.extensions?.pg?.schemaName;
  if (typeof schemaName !== 'string' || schemaName.length === 0) return null;
  return schemaName;
}

export function getUniques(resource: PgTableResource): PgUnique[] {
  return Array.isArray(resource.uniques) ? resource.uniques : [];
}

export function getRelations(
  resource: PgTableResource,
  pgRelations?: Record<string, Record<string, PgRelation>>,
): Record<string, PgRelation> {
  const fromMethod = resource.getRelations?.();
  if (fromMethod && Object.keys(fromMethod).length > 0) return fromMethod;

  // Direct registry lookup by codec name
  const codecName = resource.codec?.name;
  if (codecName && pgRelations?.[codecName]) {
    const fromRegistry = pgRelations[codecName];
    if (Object.keys(fromRegistry).length > 0) return fromRegistry;
  }

  return resource.relations || {};
}

export function getRelation(resource: PgTableResource, relationName: string): PgRelation | null {
  if (!relationName) return null;
  if (typeof resource.getRelation === 'function') {
    return resource.getRelation(relationName) || null;
  }
  const relations = getRelations(resource);
  return relations[relationName] || null;
}

export function sameAttributes(
  uniqueAttributes: string[] | undefined,
  relationAttributes: string[] | undefined,
): boolean {
  if (!uniqueAttributes || !relationAttributes) return false;
  return (
    uniqueAttributes.length === relationAttributes.length &&
    uniqueAttributes.every((attrName) => relationAttributes.includes(attrName))
  );
}

export function getConfiguredSchemas(build: MetaBuild): string[] {
  const pgSchemas = build.options?.pgSchemas;
  if (!Array.isArray(pgSchemas)) return [];
  return pgSchemas.filter((schemaName): schemaName is string => typeof schemaName === 'string');
}

export function getResourceCodec(
  resource: PgTableResource,
): (PgCodec & { attributes: Record<string, PgAttribute> }) | null {
  const codec = resource.codec;
  if (!codec?.attributes) return null;
  return codec as PgCodec & { attributes: Record<string, PgAttribute> };
}
