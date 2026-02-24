/**
 * Core SQL expression validation utilities.
 *
 * Standalone functions with no PostGraphile dependency.
 * Uses pgsql-parser to parse SQL expressions and pgsql-deparser to
 * produce canonical text output.
 *
 * SECURITY: Uses an allowlist approach — only explicitly allowed AST
 * node types are accepted. Any unknown or unrecognized node type is
 * rejected. This is safer than a denylist because new/unknown node
 * types are blocked by default.
 */

import { parse } from 'pgsql-parser';
import { deparseSync } from 'pgsql-deparser';

// ─── Types ────────────────────────────────────────────────────────

export interface SqlExpressionValidatorOptions {
  /** List of allowed unqualified function names (case-insensitive). */
  allowedFunctions?: string[];
  /** List of allowed schema names for schema-qualified function calls. */
  allowedSchemas?: string[];
  /** Maximum allowed expression length in characters. Defaults to 10000. */
  maxExpressionLength?: number;
}

export interface SqlExpressionValidationResult {
  valid: boolean;
  ast?: Record<string, unknown>;
  canonicalText?: string;
  error?: string;
}

export interface AstValidationResult {
  valid: boolean;
  canonicalText?: string;
  error?: string;
}

interface AstNodeValidationResult {
  valid: boolean;
  error?: string;
}

// ─── Constants ────────────────────────────────────────────────────

/**
 * Default list of allowed unqualified function names.
 * These are common PostgreSQL functions considered safe for use in
 * SQL expression defaults.
 *
 * NOTE: `current_timestamp`, `current_date`, `current_time`, `localtime`,
 * and `localtimestamp` are parsed as `SQLValueFunction` nodes by pgsql-parser,
 * not as `FuncCall` nodes. They are handled via `ALLOWED_SVFOP` below.
 *
 * `setseed` is intentionally excluded — it makes `random()` predictable
 * for the session, which is a security risk.
 *
 * `date_part` is included as a safe alternative to `EXTRACT(... FROM ...)`,
 * which parses as `pg_catalog.extract` (a schema-qualified call that would
 * require adding `pg_catalog` to allowedSchemas — too permissive).
 */
export const DEFAULT_ALLOWED_FUNCTIONS = [
  'uuid_generate_v4',
  'gen_random_uuid',
  'now',
  'clock_timestamp',
  'statement_timestamp',
  'transaction_timestamp',
  'timeofday',
  'random',
  'date_part'
];

/**
 * AST node types that are explicitly allowed in expressions.
 * Any single-keyed object whose key is not in this set is rejected.
 *
 * This includes both expression-level nodes (A_Const, FuncCall, etc.)
 * and structural/leaf nodes that pgsql-parser uses internally for
 * value wrappers and identifiers (String, Integer, TypeName, etc.).
 *
 * Structural nodes only appear inside allowed parent nodes. Dangerous
 * parents (ColumnRef, SubLink, etc.) are rejected before recursion
 * reaches their children, so including structural types here is safe.
 */
const ALLOWED_NODE_TYPES = new Set([
  // Expression-level nodes (safe SQL expression constructs)
  'A_Const',
  'TypeCast',
  'A_Expr',
  'FuncCall',
  'CoalesceExpr',
  'NullTest',
  'BoolExpr',
  'CaseExpr',
  'CaseWhen',
  'MinMaxExpr',
  'SQLValueFunction',
  'A_ArrayExpr',
  // Structural/leaf nodes (used within expression nodes for values/identifiers)
  'String',
  'Integer',
  'Float',
  'BitString',
  'Null',
  'TypeName',
  // Value wrappers inside A_Const (pgsql-parser v17 format)
  'ival',
  'sval',
  'fval',
  'boolval',
  'bsval'
]);

/**
 * Safe SQLValueFunction.op values.
 *
 * pgsql-parser represents `current_timestamp`, `current_date`, etc.
 * as `SQLValueFunction` nodes with an `op` field. Some values like
 * `current_user` and `session_user` are dangerous (information disclosure)
 * so we only allow the time-related ones.
 */
const ALLOWED_SVFOP = new Set([
  'SVFOP_CURRENT_TIMESTAMP',
  'SVFOP_CURRENT_DATE',
  'SVFOP_CURRENT_TIME',
  'SVFOP_LOCALTIME',
  'SVFOP_LOCALTIMESTAMP'
]);

/**
 * PostgreSQL system catalog type casts that are forbidden in expressions.
 * These OID-alias types can be used to probe the system catalog.
 */
const FORBIDDEN_TYPE_CASTS = new Set([
  'regclass',
  'regtype',
  'regproc',
  'regprocedure',
  'regoper',
  'regoperator',
  'regnamespace',
  'regrole',
  'regconfig',
  'regdictionary'
]);

const MAX_AST_DEPTH = 100;
const SQL_COMMENT_TOKENS = /--|\/\*|\*\//;

// ─── Internal helpers ─────────────────────────────────────────────

/**
 * Extract the node type from a pgsql-parser AST node.
 * AST nodes are objects with a single key representing the node type.
 */
function getNodeType(node: Record<string, unknown>): { type: string | null; suspicious: boolean } {
  const keys = Object.keys(node);
  if (keys.length === 1) return { type: keys[0], suspicious: false };
  const astLikeKeys = keys.filter(k => /^[A-Z]/.test(k));
  if (astLikeKeys.length > 0) {
    return { type: null, suspicious: true };
  }
  return { type: null, suspicious: false };
}

function extractStringVal(n: unknown): string {
  if (typeof n === 'object' && n !== null) {
    const rec = n as Record<string, unknown>;
    const sval = (rec.String as Record<string, unknown> | undefined)?.sval;
    if (typeof sval === 'string') return sval;
    if (typeof rec.str === 'string') return rec.str;
  }
  return '';
}

/**
 * Recursively validate an AST node against the allowlist rules.
 * Uses mutable push/pop on path for performance.
 */
function validateAstNode(
  node: unknown,
  allowedFunctions: ReadonlySet<string>,
  allowedSchemas: ReadonlySet<string>,
  path: string[]
): AstNodeValidationResult {
  if (path.length > MAX_AST_DEPTH) {
    return {
      valid: false,
      error: `AST exceeds maximum depth of ${MAX_AST_DEPTH} at path: ${path.join('.')}`
    };
  }

  if (node === null || node === undefined || typeof node !== 'object') {
    return { valid: true };
  }

  const rec = node as Record<string, unknown>;
  const { type: nodeType, suspicious } = getNodeType(rec);

  // Multi-key AST nodes with uppercase keys are suspicious
  if (suspicious) {
    return {
      valid: false,
      error: `Suspicious multi-key AST node at path: ${path.join('.')}`
    };
  }

  // Allowlist check: if this looks like a typed AST node, it must be allowed
  if (nodeType !== null && !ALLOWED_NODE_TYPES.has(nodeType)) {
    return {
      valid: false,
      error: `Disallowed node type "${nodeType}" at path: ${path.join('.')}`
    };
  }

  // SQLValueFunction: check op is safe
  if (nodeType === 'SQLValueFunction') {
    const svf = rec.SQLValueFunction;
    if (typeof svf === 'object' && svf !== null) {
      const op = (svf as Record<string, unknown>).op;
      if (typeof op === 'string' && !ALLOWED_SVFOP.has(op)) {
        return {
          valid: false,
          error: `Disallowed SQLValueFunction op "${op}" at path: ${path.join('.')}`
        };
      }
    }
  }

  // TypeCast: check for forbidden system catalog types
  if (nodeType === 'TypeCast') {
    const typeCast = rec.TypeCast as Record<string, unknown> | undefined;
    const typeName = typeCast?.typeName as Record<string, unknown> | undefined;
    if (typeName?.names && Array.isArray(typeName.names)) {
      const names = (typeName.names as unknown[])
        .map(extractStringVal)
        .filter(Boolean);
      const castType = names[names.length - 1]?.toLowerCase();
      if (castType && FORBIDDEN_TYPE_CASTS.has(castType)) {
        return {
          valid: false,
          error: `Forbidden type cast to "${castType}" — system catalog types are not allowed`
        };
      }
    }
  }

  // FuncCall: validate function name and schema
  if (nodeType === 'FuncCall') {
    const funcCall = rec.FuncCall as Record<string, unknown> | undefined;
    const funcName = funcCall?.funcname;

    if (Array.isArray(funcName)) {
      const names = (funcName as unknown[]).map(extractStringVal);
      const schemaName = names.length > 1 ? names[0] : null;
      const functionName = names[names.length - 1];

      if (schemaName) {
        if (!allowedSchemas.has(schemaName.toLowerCase())) {
          return {
            valid: false,
            error: `Function schema "${schemaName}" is not in the allowed schemas list`
          };
        }
        // Also validate the function name when schema-qualified
        if (!allowedFunctions.has(functionName.toLowerCase())) {
          return {
            valid: false,
            error: `Function "${schemaName}.${functionName}" is not in the allowed functions list`
          };
        }
      } else {
        if (!allowedFunctions.has(functionName.toLowerCase())) {
          return {
            valid: false,
            error: `Function "${functionName}" is not in the allowed functions list`
          };
        }
      }
    }
  }

  // Recurse into children
  for (const [key, value] of Object.entries(rec)) {
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        path.push(key, String(i));
        const result = validateAstNode(
          value[i],
          allowedFunctions,
          allowedSchemas,
          path
        );
        path.pop();
        path.pop();
        if (!result.valid) return result;
      }
    } else if (value !== null && typeof value === 'object') {
      path.push(key);
      const result = validateAstNode(
        value,
        allowedFunctions,
        allowedSchemas,
        path
      );
      path.pop();
      if (!result.valid) return result;
    }
  }

  return { valid: true };
}

// ─── Public API ───────────────────────────────────────────────────

/**
 * Parse and validate a SQL expression string.
 *
 * 1. Guards: non-empty string, under maxExpressionLength, no semicolons
 * 2. Wraps in `SELECT (expression)` then parses with pgsql-parser
 * 3. Extracts AST from the parse result
 * 4. Recursively validates the AST against the allowlist
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

  if (SQL_COMMENT_TOKENS.test(expression)) {
    return {
      valid: false,
      error: 'Expression cannot contain SQL comments'
    };
  }

  const funcSet = new Set(allowedFunctions.map((f) => f.toLowerCase()));
  const schemaSet = new Set(allowedSchemas.map((s) => s.toLowerCase()));

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

    const selectStmt = stmt.SelectStmt;
    const DANGEROUS_SELECT_KEYS = [
      'fromClause', 'whereClause', 'larg', 'rarg', 'valuesLists',
      'intoClause', 'withClause', 'groupClause', 'havingClause',
      'windowClause', 'sortClause', 'limitOffset', 'limitCount',
      'lockingClause'
    ];
    for (const dangerousKey of DANGEROUS_SELECT_KEYS) {
      if (selectStmt[dangerousKey] !== undefined) {
        return {
          valid: false,
          error: `Expression contains disallowed SQL clause: ${dangerousKey}`
        };
      }
    }

    const targetList = selectStmt.targetList;
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

    const expressionAst = resTarget.val as Record<string, unknown>;
    const validationResult = validateAstNode(
      expressionAst,
      funcSet,
      schemaSet,
      []
    );

    if (!validationResult.valid) {
      return { valid: false, error: validationResult.error };
    }

    let canonicalText: string;
    try {
      canonicalText = deparseSync([expressionAst] as Parameters<typeof deparseSync>[0]);
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
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      valid: false,
      error: `Failed to parse SQL expression: ${msg}`
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
export function validateAst(
  ast: unknown,
  options: SqlExpressionValidatorOptions = {}
): AstValidationResult {
  const {
    allowedFunctions = DEFAULT_ALLOWED_FUNCTIONS,
    allowedSchemas = []
  } = options;

  if (!ast || typeof ast !== 'object') {
    return { valid: false, error: 'AST must be a non-null object' };
  }

  const funcSet = new Set(allowedFunctions.map((f) => f.toLowerCase()));
  const schemaSet = new Set(allowedSchemas.map((s) => s.toLowerCase()));

  const validationResult = validateAstNode(
    ast,
    funcSet,
    schemaSet,
    []
  );

  if (!validationResult.valid) {
    return { valid: false, error: validationResult.error };
  }

  try {
    const canonicalText = deparseSync([ast] as Parameters<typeof deparseSync>[0]);
    return { valid: true, canonicalText };
  } catch (deparseError) {
    return {
      valid: false,
      error: `Failed to deparse AST: ${deparseError}`
    };
  }
}
