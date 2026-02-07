/**
 * Shared helpers for select type resolution in custom operations
 *
 * Used by custom-queries.ts, custom-mutations.ts, and orm/custom-ops-generator.ts
 */
import type { CleanArgument, TypeRegistry } from '../../types/schema';
import { SCALAR_NAMES } from './scalars';
import { getTypeBaseName } from './type-resolver';

/**
 * Types that don't need Select types (scalars + root query/mutation types)
 */
export const NON_SELECT_TYPES = new Set<string>([
  ...SCALAR_NAMES,
  'Query',
  'Mutation'
]);

/**
 * Get the Select type name for a return type.
 * Returns null for scalar types, Connection types, and root types.
 */
export function getSelectTypeName(returnType: CleanArgument['type']): string | null {
  const baseName = getTypeBaseName(returnType);
  if (
    baseName &&
    !NON_SELECT_TYPES.has(baseName) &&
    !baseName.endsWith('Connection')
  ) {
    return `${baseName}Select`;
  }
  return null;
}

/**
 * Wrap a type reference in InferSelectResult, handling NON_NULL and LIST wrappers.
 */
export function wrapInferSelectResult(
  typeRef: CleanArgument['type'],
  payloadTypeName: string,
  selectType: string = 'S'
): string {
  if (typeRef.kind === 'NON_NULL' && typeRef.ofType) {
    return wrapInferSelectResult(typeRef.ofType as CleanArgument['type'], payloadTypeName, selectType);
  }

  if (typeRef.kind === 'LIST' && typeRef.ofType) {
    return `${wrapInferSelectResult(typeRef.ofType as CleanArgument['type'], payloadTypeName, selectType)}[]`;
  }

  return `InferSelectResult<${payloadTypeName}, ${selectType}>`;
}

/**
 * Build a default select literal string for a given type.
 * Finds an 'id' or 'nodeId' field, or falls back to first scalar field.
 */
export function buildDefaultSelectLiteral(
  typeName: string,
  typeRegistry: TypeRegistry,
  depth: number = 0
): string {
  const resolved = typeRegistry.get(typeName);
  const fields = resolved?.fields ?? [];

  if (depth > 3 || fields.length === 0) {
    // Use first field if available, otherwise fallback to 'id'
    return fields.length > 0 ? `{ ${fields[0].name}: true }` : `{ id: true }`;
  }

  const idLike = fields.find((f) => f.name === 'id' || f.name === 'nodeId');
  if (idLike) return `{ ${idLike.name}: true }`;

  const scalarField = fields.find((f) => {
    const baseName = getTypeBaseName(f.type);
    if (!baseName) return false;
    if (NON_SELECT_TYPES.has(baseName)) return true;
    return typeRegistry.get(baseName)?.kind === 'ENUM';
  });
  if (scalarField) return `{ ${scalarField.name}: true }`;

  const first = fields[0];

  const firstBase = getTypeBaseName(first.type);
  if (!firstBase || NON_SELECT_TYPES.has(firstBase) || typeRegistry.get(firstBase)?.kind === 'ENUM') {
    return `{ ${first.name}: true }`;
  }

  const nested = buildDefaultSelectLiteral(firstBase, typeRegistry, depth + 1);
  return `{ ${first.name}: { select: ${nested} } }`;
}
