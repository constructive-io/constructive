/**
 * PostGraphile v5 SQL Expression Validator Preset
 *
 * Provides a convenient preset for including the SQL expression
 * validator plugin in PostGraphile v5 configurations.
 */

import type { GraphileConfig } from 'graphile-config';
import type { SqlExpressionValidatorOptions } from './types';
import { createSqlExpressionValidatorPlugin } from './plugin';

/**
 * Creates a preset that includes the SQL expression validator plugin.
 *
 * @example
 * ```typescript
 * import { SqlExpressionValidatorPreset } from 'graphile-sql-expression-validator';
 *
 * const preset: GraphileConfig.Preset = {
 *   extends: [
 *     SqlExpressionValidatorPreset({
 *       allowedSchemas: ['app_public'],
 *       allowOwnedSchemas: true,
 *     }),
 *   ],
 * };
 * ```
 */
export function SqlExpressionValidatorPreset(
  options: SqlExpressionValidatorOptions = {}
): GraphileConfig.Preset {
  return {
    plugins: [createSqlExpressionValidatorPlugin(options)]
  };
}

export default SqlExpressionValidatorPreset;
