/**
 * Shared name-matching utilities for resolving PostGraphile v5 naming mismatches.
 *
 * PostGraphile v5 uses different inflection conventions in different contexts:
 *   - Table types are PascalCase (e.g., "Shipment", "DeliveryZone")
 *   - Relation codec names are raw snake_case or camelCase (e.g., "shipments", "deliveryZones")
 *
 * These helpers provide a single, shared way to normalize and compare names
 * across those boundaries instead of duplicating fuzzy-match logic in every consumer.
 *
 * NOTE: These functions are also available in inflekt >=0.4.0
 * (fuzzyFindByName, normalizeName, normalizeNameSingular, namesMatch).
 * Once inflekt 0.4.0 is published and the dependency is bumped, the consumers
 * can import directly from inflekt and this file can be removed.
 */

/**
 * Normalize a name for case-insensitive, delimiter-insensitive comparison.
 * Strips underscores and lowercases.
 */
function normalizeName(name: string): string {
  return name.toLowerCase().replace(/_/g, '');
}

/**
 * Normalize a name to its singular base form for comparison.
 * Strips underscores, lowercases, and removes a trailing 's' when present.
 */
function normalizeNameSingular(name: string): string {
  const normalized = normalizeName(name);
  return normalized.endsWith('s') ? normalized.slice(0, -1) : normalized;
}

/**
 * Find a matching item by name using exact match first, then fuzzy
 * case-insensitive / plural-insensitive fallback.
 *
 * This is the single shared implementation for resolving relation target names
 * to table definitions, replacing ad-hoc fuzzy matching scattered across consumers.
 *
 * @param items      - Array of items to search through
 * @param targetName - The name to find (may be PascalCase, snake_case, plural, etc.)
 * @param getName    - Accessor to extract the comparable name from each item
 * @returns The matched item, or undefined if no match found
 */
export function fuzzyFindByName<T>(
  items: T[],
  targetName: string,
  getName: (item: T) => string,
): T | undefined {
  // 1. Exact match (fast path)
  const exact = items.find((item) => getName(item) === targetName);
  if (exact) return exact;

  // 2. Fuzzy match: case-insensitive, strip underscores, optional trailing 's'
  const targetNormalized = normalizeName(targetName);
  const targetBase = normalizeNameSingular(targetName);

  return items.find((item) => {
    const itemNormalized = normalizeName(getName(item));
    return itemNormalized === targetNormalized || itemNormalized === targetBase;
  });
}
