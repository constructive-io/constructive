/**
 * Utility functions for GraphQL query generation
 */

/**
 * PostGraphile boilerplate description prefixes that should be suppressed
 */
const POSTGRAPHILE_BOILERPLATE: string[] = [
  'The exclusive input argument for this mutation.',
  'An arbitrary string value with no semantic meaning.',
  'The exact same `clientMutationId` that was provided in the mutation input,',
  'The output of our',
  'All input for the',
  'A cursor for use in pagination.',
  'An edge for our',
  'Information to aid in pagination.',
  'Reads and enables pagination through a set of',
  'A list of edges which contains the',
  'The count of *all* `',
  'A list of `',
  'Our root query field',
  'Reads a single',
  'The root query type',
  'The root mutation type',
];

/**
 * Check if a description is generic PostGraphile boilerplate that should be suppressed.
 */
function isBoilerplateDescription(description: string): boolean {
  const trimmed = description.trim();
  return POSTGRAPHILE_BOILERPLATE.some((bp) => trimmed.startsWith(bp));
}

/**
 * Strip PostGraphile smart comments and boilerplate from a description string.
 *
 * Smart comments are lines starting with `@` (e.g., `@omit`, `@name newName`).
 * Boilerplate descriptions are generic PostGraphile-generated text that repeats
 * on every mutation input, clientMutationId field, etc.
 *
 * This returns only the meaningful human-readable portion of the comment,
 * or undefined if the result is empty or boilerplate.
 *
 * @param description - Raw description from GraphQL introspection
 * @returns Cleaned description, or undefined if empty/boilerplate
 */
export function stripSmartComments(
  description: string | null | undefined,
  enabled: boolean = true,
): string | undefined {
  if (!enabled) return undefined;
  if (!description) return undefined;

  // Check if entire description is boilerplate
  if (isBoilerplateDescription(description)) return undefined;

  const lines = description.split('\n');
  const cleanLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Skip lines that start with @ (smart comment directives)
    if (trimmed.startsWith('@')) continue;
    cleanLines.push(line);
  }

  const result = cleanLines.join('\n').trim();
  if (result.length === 0) return undefined;

  // Re-check after stripping smart comments
  if (isBoilerplateDescription(result)) return undefined;

  return result;
}
