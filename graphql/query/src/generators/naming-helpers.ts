/**
 * Server-aware naming helpers for GraphQL query/mutation generation.
 *
 * These functions prefer names already discovered from the GraphQL schema
 * (stored on `table.query` and `table.inflection` by `infer-tables.ts`)
 * and fall back to local inflection when introspection data is unavailable.
 *
 * Back-ported from Dashboard's `packages/data/src/query-generator.ts`.
 */
import { toCamelCase, pluralize } from 'inflekt';

import type { Table } from '../types/schema';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Safely normalise a server-provided inflection value.
 * Returns `null` for null, undefined, or whitespace-only strings.
 */
export function normalizeInflectionValue(
  value: string | null | undefined,
): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

// ---------------------------------------------------------------------------
// Plural / Singular
// ---------------------------------------------------------------------------

/**
 * Convert PascalCase table name to camelCase plural for GraphQL queries.
 * Prefers server-provided `table.query.all` / `table.inflection.allRows`
 * when available, with guards against naive pluralisation drift and
 * missing camelCase boundaries.
 *
 * Example: "ActionGoal" -> "actionGoals", "User" -> "users", "Person" -> "people"
 */
export function toCamelCasePlural(
  tableName: string,
  table?: Table | null,
): string {
  const singular = toCamelCase(tableName);
  const inflectedPlural = pluralize(singular);
  const serverPluralCandidates = [
    table?.query?.all,
    table?.inflection?.allRows,
  ];

  for (const candidateRaw of serverPluralCandidates) {
    const candidate = normalizeInflectionValue(candidateRaw);
    if (!candidate) continue;

    // Guard against known fallback drift:
    // 1. Naive pluralisation: "activitys" instead of "activities"
    const isNaivePlural =
      candidate === `${singular}s` && candidate !== inflectedPlural;
    // 2. Missing camelCase boundaries: "deliveryzones" instead of "deliveryZones"
    const isMiscased =
      candidate !== inflectedPlural &&
      candidate.toLowerCase() === inflectedPlural.toLowerCase();
    if (isNaivePlural || isMiscased) continue;

    return candidate;
  }

  return inflectedPlural;
}

/**
 * Convert PascalCase table name to camelCase singular field name.
 * Prefers server-provided names when available.
 */
export function toCamelCaseSingular(
  tableName: string,
  table?: Table | null,
): string {
  const localSingular = toCamelCase(tableName);

  for (const candidateRaw of [
    table?.query?.one,
    table?.inflection?.tableFieldName,
  ]) {
    const candidate = normalizeInflectionValue(candidateRaw);
    if (!candidate) continue;
    // Reject miscased versions: "deliveryzone" vs "deliveryZone"
    if (
      candidate !== localSingular &&
      candidate.toLowerCase() === localSingular.toLowerCase()
    )
      continue;
    return candidate;
  }

  return localSingular;
}

// ---------------------------------------------------------------------------
// Mutation names
// ---------------------------------------------------------------------------

export function toCreateMutationName(
  tableName: string,
  table?: Table | null,
): string {
  return (
    normalizeInflectionValue(table?.query?.create) ?? `create${tableName}`
  );
}

export function toUpdateMutationName(
  tableName: string,
  table?: Table | null,
): string {
  return (
    normalizeInflectionValue(table?.query?.update) ?? `update${tableName}`
  );
}

export function toDeleteMutationName(
  tableName: string,
  table?: Table | null,
): string {
  return (
    normalizeInflectionValue(table?.query?.delete) ?? `delete${tableName}`
  );
}

// ---------------------------------------------------------------------------
// Input / type names
// ---------------------------------------------------------------------------

export function toCreateInputTypeName(
  tableName: string,
  table?: Table | null,
): string {
  return (
    normalizeInflectionValue(table?.inflection?.createInputType) ??
    `Create${tableName}Input`
  );
}

export function toUpdateInputTypeName(tableName: string): string {
  return `Update${tableName}Input`;
}

export function toDeleteInputTypeName(tableName: string): string {
  return `Delete${tableName}Input`;
}

export function toFilterTypeName(
  tableName: string,
  table?: Table | null,
): string {
  return (
    normalizeInflectionValue(table?.inflection?.filterType) ??
    `${tableName}Filter`
  );
}

// ---------------------------------------------------------------------------
// Patch field name
// ---------------------------------------------------------------------------

/**
 * Resolve PostGraphile patch field name.
 * In v5 this is typically entity-specific: e.g. "userPatch", "contactPatch".
 * Prefers the value discovered from the schema (`table.query.patchFieldName`
 * or `table.inflection.patchField`), falls back to `${singularName}Patch`.
 */
export function toPatchFieldName(
  tableName: string,
  table?: Table | null,
): string {
  // First check the patch field name discovered from UpdateXxxInput
  const introspectedPatch = normalizeInflectionValue(
    table?.query?.patchFieldName,
  );
  if (introspectedPatch) return introspectedPatch;

  // Then check the inflection table
  const explicitPatchField = normalizeInflectionValue(
    table?.inflection?.patchField,
  );
  if (explicitPatchField) return explicitPatchField;

  return `${toCamelCaseSingular(tableName, table)}Patch`;
}

// ---------------------------------------------------------------------------
// OrderBy helpers
// ---------------------------------------------------------------------------

/**
 * Convert camelCase field name to SCREAMING_SNAKE_CASE for PostGraphile
 * orderBy enums.
 *
 * "displayName" -> "DISPLAY_NAME_ASC"
 * "createdAt"   -> "CREATED_AT_DESC"
 * "id"          -> "ID_ASC"
 */
export function toOrderByEnumValue(
  fieldName: string,
  direction: 'asc' | 'desc',
): string {
  const screaming = fieldName
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toUpperCase();
  return `${screaming}_${direction.toUpperCase()}`;
}

/**
 * Generate the PostGraphile OrderBy enum type name for a table.
 * Prefers server-provided `table.inflection.orderByType` when available.
 */
export function toOrderByTypeName(
  tableName: string,
  table?: Table | null,
): string {
  if (table?.inflection?.orderByType) return table.inflection.orderByType;
  const plural = toCamelCasePlural(tableName, table);
  return `${plural.charAt(0).toUpperCase() + plural.slice(1)}OrderBy`;
}
