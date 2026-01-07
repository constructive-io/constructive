/**
 * Pluralization utilities for inferring entity names from PostGraphile patterns
 *
 * Uses the 'inflection' package which is already a dependency of this package.
 */
import * as inflection from 'inflection';

/**
 * Latin plural suffixes that inflection handles differently than PostGraphile.
 *
 * The inflection library correctly singularizes Latin words (schemata → schematum),
 * but PostGraphile uses English-style naming (schemata → schema).
 *
 * Format: [pluralSuffix, singularSuffix]
 */
const LATIN_SUFFIX_OVERRIDES: Array<[string, string]> = [
  // Common Latin plural endings
  ['schemata', 'schema'],
  ['criteria', 'criterion'],
  ['phenomena', 'phenomenon'],
  ['media', 'medium'],
  ['memoranda', 'memorandum'],
  ['strata', 'stratum'],
  ['curricula', 'curriculum'],
  ['data', 'datum'],
];

/**
 * Convert a word to its singular form
 * @example "Users" → "User", "People" → "Person", "Schemata" → "Schema", "ApiSchemata" → "ApiSchema"
 */
export function singularize(word: string): string {
  // Check for Latin suffix overrides (handles compound words like "ApiSchemata")
  const lowerWord = word.toLowerCase();

  for (const [pluralSuffix, singularSuffix] of LATIN_SUFFIX_OVERRIDES) {
    if (lowerWord.endsWith(pluralSuffix)) {
      // Find where the suffix starts in the original word (preserving case)
      const suffixStart = word.length - pluralSuffix.length;
      const prefix = word.slice(0, suffixStart);
      const originalSuffix = word.slice(suffixStart);

      // Preserve the casing of the first letter of the suffix
      const isUpperSuffix =
        originalSuffix[0] === originalSuffix[0].toUpperCase();
      const newSuffix = isUpperSuffix
        ? singularSuffix.charAt(0).toUpperCase() + singularSuffix.slice(1)
        : singularSuffix;

      return prefix + newSuffix;
    }
  }

  return inflection.singularize(word);
}

/**
 * Convert a word to its plural form
 * @example "User" → "Users", "Person" → "People"
 */
export function pluralize(word: string): string {
  return inflection.pluralize(word);
}

/**
 * Convert PascalCase to camelCase
 * @example "UserProfile" → "userProfile"
 */
export function lcFirst(str: string): string {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

/**
 * Convert camelCase to PascalCase
 * @example "userProfile" → "UserProfile"
 */
export function ucFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert a plural PascalCase type name to singular camelCase field name
 * @example "Users" → "user", "OrderItems" → "orderItem"
 */
export function toFieldName(pluralTypeName: string): string {
  return lcFirst(singularize(pluralTypeName));
}

/**
 * Convert a singular PascalCase type name to plural camelCase query name
 * @example "User" → "users", "OrderItem" → "orderItems"
 */
export function toQueryName(singularTypeName: string): string {
  return lcFirst(pluralize(singularTypeName));
}
