/**
 * Shared helpers for select type resolution in custom operations
 *
 * Used by custom-queries.ts, custom-mutations.ts, and orm/custom-ops-generator.ts
 */
import type { Argument } from '../../types/schema';
import { SCALAR_NAMES } from './scalars';
import { getTypeBaseName } from './type-resolver';

/**
 * Types that don't need Select types (scalars + root query/mutation types)
 */
export const NON_SELECT_TYPES = new Set<string>([
  ...SCALAR_NAMES,
  'Query',
  'Mutation',
]);

/**
 * Get the Select type name for a return type.
 * Returns null for scalar types, Connection types, and root types.
 */
export function getSelectTypeName(
  returnType: Argument['type'],
): string | null {
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
  typeRef: Argument['type'],
  payloadTypeName: string,
  selectType: string = 'S',
): string {
  if (typeRef.kind === 'NON_NULL' && typeRef.ofType) {
    return wrapInferSelectResult(
      typeRef.ofType as Argument['type'],
      payloadTypeName,
      selectType,
    );
  }

  if (typeRef.kind === 'LIST' && typeRef.ofType) {
    return `${wrapInferSelectResult(typeRef.ofType as Argument['type'], payloadTypeName, selectType)}[]`;
  }

  return `InferSelectResult<${payloadTypeName}, ${selectType}>`;
}
