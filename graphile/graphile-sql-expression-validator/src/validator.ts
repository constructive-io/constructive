/**
 * Core SQL expression validation utilities.
 *
 * Standalone functions with no PostGraphile dependency.
 * Uses pgsql-parser to parse SQL expressions and pgsql-deparser to
 * produce canonical text output.
 */

import { parse } from 'pgsql-parser';
import { deparse } from 'pgsql-deparser';
import type {
  SqlExpressionValidatorOptions,
  SqlExpressionValidationResult,
  AstValidationResult,
  AstNodeValidationResult
} from './types';

/**
 * Default list of allowed unqualified function names.
 * These are common PostgreSQL functions considered safe for use in
 * SQL expression defaults.
 */
export const DEFAULT_ALLOWED_FUNCTIONS = [
  'uuid_generate_v4',
  'gen_random_uuid',
  'now',
  'current_timestamp',
  'current_date',
  'current_time',
  'localtime',
  'localtimestamp',
  'clock_timestamp',
  'statement_timestamp',
  'transaction_timestamp',
  'timeofday',
  'random',
  'setseed'
];

/**
 * AST node types that are explicitly allowed in expressions.
 */
const ALLOWED_NODE_TYPES = new Set([
  'A_Const',
  'TypeCast',
  'A_Expr',
  'FuncCall',
  'CoalesceExpr',
  'NullTest',
  'BoolExpr',
  'CaseExpr',
  'CaseWhen'
]);

/**
 * AST node types that are forbidden in expressions.
 * These represent SQL statements, column references, subqueries,
 * and table access patterns that could be exploited.
 */
const FORBIDDEN_NODE_TYPES = new Set([
  'SelectStmt',
  'InsertStmt',
  'UpdateStmt',
  'DeleteStmt',
  'CreateStmt',
  'AlterTableStmt',
  'DropStmt',
  'TruncateStmt',
  'ColumnRef',
  'SubLink',
  'RangeVar',
  'RangeSubselect',
  'JoinExpr',
  'FromExpr'
]);

/**
 * Extract the node type from a pgsql-parser AST node.
 * AST nodes are objects with a single key representing the node type.
 */
function getNodeType(node: any): string | null {
  if (!node || typeof node !== 'object') return null;
  const keys = Object.keys(node);
  if (keys.length === 1) return keys[0];
  return null;
}

/**
 * Recursively validate an AST node against the allowed/forbidden rules.
 */
function validateAstNode(
  node: any,
  allowedFunctions: string[],
  allowedSchemas: string[],
  path: string[] = []
): AstNodeValidationResult {
  if (!node || typeof node !== 'object') {
    return { valid: true };
  }

  const nodeType = getNodeType(node);

  if (nodeType && FORBIDDEN_NODE_TYPES.has(nodeType)) {
    return {
      valid: false,
      error: `Forbidden node type "${nodeType}" at path: ${path.join('.')}`
    };
  }

  if (nodeType === 'FuncCall') {
    const funcCall = node.FuncCall;
    const funcName = funcCall?.funcname;

    if (Array.isArray(funcName)) {
      const names = funcName.map(
        (n: any) => n.String?.sval || n.str || ''
      );
      const schemaName = names.length > 1 ? names[0] : null;
      const functionName = names[names.length - 1];

      if (schemaName) {
        if (!allowedSchemas.includes(schemaName)) {
          return {
            valid: false,
            error: `Function schema "${schemaName}" is not in the allowed schemas list`
          };
        }
      } else {
        if (!allowedFunctions.includes(functionName.toLowerCase())) {
          return {
            valid: false,
            error: `Function "${functionName}" is not in the allowed functions list`
          };
        }
      }
    }
  }

  for (const [key, value] of Object.entries(node)) {
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        const result = validateAstNode(
          value[i],
          allowedFunctions,
          allowedSchemas,
          [...path, key, String(i)]
        );
        if (!result.valid) return result;
      }
    } else if (value && typeof value === 'object') {
      const result = validateAstNode(value, allowedFunctions, allowedSchemas, [
        ...path,
        key
      ]);
      if (!result.valid) return result;
    }
  }

  return { valid: true };
}

/**
 * Parse and validate a SQL expression string.
 *
 * 1. Guards: non-empty string, under maxExpressionLength, no semicolons
 * 2. Wraps in `SELECT (expression)` then parses with pgsql-parser
 * 3. Extracts AST from the parse result
 * 4. Recursively validates the AST against allowed/forbidden rules
 * 5. Deparses via pgsql-deparser to produce canonical text
 *
 * @param expression - The SQL expression string to validate.
 * @param options - Validation options.
 * @returns Validation result with canonical text and AST on success.
 */
export async function parseAndValidateSqlExpression(
  expression: string,
  options: SqlExpressionValidatorOptions = {}
): Promise<SqlExpressionValidationResult> {
  const {
    allowedFunctions = DEFAULT_ALLOWED_FUNCTIONS,
    allowedSchemas = [],
    maxExpressionLength = 10000
  } = options;

  if (!expression || typeof expression !== 'string') {
    return { valid: false, error: 'Expression must be a non-empty string' };
  }

  if (expression.length > maxExpressionLength) {
    return {
      valid: false,
      error: `Expression exceeds maximum length of ${maxExpressionLength} characters`
    };
  }

  if (expression.includes(';')) {
    return {
      valid: false,
      error: 'Expression cannot contain semicolons (no stacked statements)'
    };
  }

  try {
    const wrappedSql = `SELECT (${expression})`;
    const parseResult = await parse(wrappedSql);

    if (
      !parseResult ||
      !parseResult.stmts ||
      parseResult.stmts.length !== 1
    ) {
      return { valid: false, error: 'Failed to parse expression' };
    }

    const stmt = parseResult.stmts[0]?.stmt;
    if (!stmt?.SelectStmt) {
      return { valid: false, error: 'Unexpected parse result structure' };
    }

    const targetList = stmt.SelectStmt.targetList;
    if (!targetList || targetList.length !== 1) {
      return { valid: false, error: 'Expected single expression' };
    }

    const resTarget = targetList[0]?.ResTarget;
    if (!resTarget || !resTarget.val) {
      return {
        valid: false,
        error: 'Could not extract expression from parse result'
      };
    }

    const expressionAst = resTarget.val;
    const validationResult = validateAstNode(
      expressionAst,
      allowedFunctions.map((f) => f.toLowerCase()),
      allowedSchemas
    );

    if (!validationResult.valid) {
      return { valid: false, error: validationResult.error! };
    }

    let canonicalText: string;
    try {
      canonicalText = await deparse([expressionAst]);
    } catch (deparseError) {
      return {
        valid: false,
        error: `Failed to deparse expression: ${deparseError}`
      };
    }

    return {
      valid: true,
      ast: expressionAst,
      canonicalText
    };
  } catch (parseError: any) {
    return {
      valid: false,
      error: `Failed to parse SQL expression: ${parseError.message || parseError}`
    };
  }
}

/**
 * Validate an already-parsed AST.
 *
 * @param ast - The AST object to validate.
 * @param options - Validation options.
 * @returns Validation result with canonical text on success.
 */
export async function validateAst(
  ast: any,
  options: SqlExpressionValidatorOptions = {}
): Promise<AstValidationResult> {
  const {
    allowedFunctions = DEFAULT_ALLOWED_FUNCTIONS,
    allowedSchemas = []
  } = options;

  if (!ast || typeof ast !== 'object') {
    return { valid: false, error: 'AST must be a non-null object' };
  }

  const validationResult = validateAstNode(
    ast,
    allowedFunctions.map((f) => f.toLowerCase()),
    allowedSchemas
  );

  if (!validationResult.valid) {
    return { valid: false, error: validationResult.error! };
  }

  try {
    const canonicalText = await deparse([ast]);
    return { valid: true, canonicalText };
  } catch (deparseError) {
    return {
      valid: false,
      error: `Failed to deparse AST: ${deparseError}`
    };
  }
}
