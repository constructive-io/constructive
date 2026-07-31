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
 *     }),
 *   ],
 * };
 * ```
 */

// Standalone validation utilities
export {
  DEFAULT_ALLOWED_FUNCTIONS,
  parseAndValidateSqlExpression,
  validateAst} from './validator';

// Types
export type {
  AstValidationResult,
  SqlExpressionValidationResult,
  SqlExpressionValidatorOptions} from './validator';

// PostGraphile v5 plugin and preset
export {
  createSqlExpressionValidatorPlugin,
  SqlExpressionValidatorPreset
} from './plugin';

// FieldType / FieldDefault structured models
export {
  fieldDefaultToAst,
  fieldDefaultToSql,
  fieldTypeToAst,
  fieldTypeToSql,
  FORBIDDEN_TYPES,
  validateFieldDefault,
  validateFieldType} from './field-types';

// FieldType / FieldDefault types
export type {
  FieldDefault,
  FieldDefaultArg,
  FieldDefaultValidationOptions,
  FieldDefaultValidationResult,
  FieldType,
  FieldTypeValidationOptions,
  FieldTypeValidationResult} from './field-types';
