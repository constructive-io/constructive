/**
 * SQL Expression Validator for PostGraphile v5
 *
 * Provides both standalone SQL expression validation utilities and a
 * PostGraphile v5 plugin that validates `@sqlExpression` tagged columns
 * in mutation inputs.
 *
 * @example Standalone validation
 * ```typescript
 * import { parseAndValidateSqlExpression } from 'graphile-sql-expression-validator';
 *
 * const result = await parseAndValidateSqlExpression('now()', {
 *   allowedFunctions: ['now', 'gen_random_uuid'],
 * });
 * if (result.valid) {
 *   console.log(result.canonicalText); // 'now()'
 * }
 * ```
 *
 * @example PostGraphile v5 preset
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

// Standalone validation utilities
export {
  parseAndValidateSqlExpression,
  validateAst,
  DEFAULT_ALLOWED_FUNCTIONS
} from './validator';

// PostGraphile v5 plugin
export {
  createSqlExpressionValidatorPlugin,
  SqlExpressionValidatorPlugin
} from './plugin';

// Preset
export {
  SqlExpressionValidatorPreset
} from './preset';

// Types
export type {
  SqlExpressionValidatorOptions,
  SqlExpressionValidationResult,
  AstValidationResult
} from './types';
