import type { GraphileConfig } from 'graphile-config';

/**
 * Plugin that uppercases PostgreSQL enum values in the GraphQL schema.
 *
 * WHY THIS EXISTS:
 * In PostGraphile v4, custom PostgreSQL enum values (e.g., 'app', 'core', 'module')
 * were automatically uppercased to CONSTANT_CASE ('APP', 'CORE', 'MODULE').
 * In PostGraphile v5, the default `enumValue` inflector preserves the original
 * PostgreSQL casing via `coerceToGraphQLName(value)`, resulting in lowercase
 * enum values in the GraphQL schema.
 *
 * This plugin overrides the `enumValue` inflector to uppercase the result,
 * restoring v4 behavior. It delegates to the previous inflector first to
 * retain all special character handling (asterisks, symbols, etc.).
 */
export const UppercaseEnumsPlugin: GraphileConfig.Plugin = {
  name: 'UppercaseEnumsPlugin',
  version: '1.0.0',

  inflection: {
    replace: {
      enumValue(previous, _options, value, codec) {
        const result = previous!(value, codec);
        return result.toUpperCase();
      },
    },
  },
};

export const UppercaseEnumsPreset: GraphileConfig.Preset = {
  plugins: [UppercaseEnumsPlugin],
};
