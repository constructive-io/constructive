/**
 * TypeScript interfaces for SQL expression validation.
 */

/**
 * Options for the SQL expression validator.
 */
export interface SqlExpressionValidatorOptions {
  /** List of allowed unqualified function names (case-insensitive). */
  allowedFunctions?: string[];
  /** List of allowed schema names for schema-qualified function calls. */
  allowedSchemas?: string[];
  /** Maximum allowed expression length in characters. Defaults to 10000. */
  maxExpressionLength?: number;
  /** When true, queries the DB for schemas the current user owns. */
  allowOwnedSchemas?: boolean;
  /** Callback to provide additional allowed schemas from the GraphQL context. */
  getAdditionalAllowedSchemas?: (context: any) => Promise<string[]>;
}

/**
 * Result of parseAndValidateSqlExpression.
 *
 * When `valid` is true, `ast` and `canonicalText` are populated.
 * When `valid` is false, `error` contains the validation error message.
 */
export interface SqlExpressionValidationResult {
  valid: boolean;
  ast?: any;
  canonicalText?: string;
  error?: string;
}

/**
 * Result of validateAst.
 *
 * When `valid` is true, `canonicalText` is populated.
 * When `valid` is false, `error` contains the validation error message.
 */
export interface AstValidationResult {
  valid: boolean;
  canonicalText?: string;
  error?: string;
}

/**
 * Internal result from recursive AST validation.
 */
export interface AstNodeValidationResult {
  valid: boolean;
  error?: string;
}
