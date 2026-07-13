/**
 * Parse the permissive boolean syntax historically used by Constructive env
 * resolvers.
 *
 * Only `true`, `1`, and `yes` (case-insensitive) are true. Every other defined
 * string is false; an absent value remains undefined. Input is intentionally
 * not trimmed so existing behavior is preserved.
 */
export const parseEnvBoolean = (value?: string): boolean | undefined => {
  if (value === undefined) return undefined;
  return ['true', '1', 'yes'].includes(value.toLowerCase());
};

/**
 * Parse an environment value with JavaScript's permissive `Number` semantics.
 * Values whose conversion is NaN are treated as unset.
 */
export const parseEnvNumber = (value?: string): number | undefined => {
  const number = Number(value);
  return !isNaN(number) ? number : undefined;
};

/**
 * Parse a comma-separated environment value, trimming entries and removing
 * empty entries. An absent or empty source value is treated as unset.
 */
export const parseEnvStringArray = (value?: string): string[] | undefined => {
  if (!value) return undefined;
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};
