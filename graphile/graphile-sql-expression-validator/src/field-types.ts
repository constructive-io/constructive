/**
 * FieldType and FieldDefault: structured JSONB models for PostgreSQL
 * type declarations and default value expressions.
 *
 * These models provide a safe, validated representation that can be:
 * 1. Validated structurally (JSON shape, identifier patterns, allowlists)
 * 2. Converted to pgsql-parser AST nodes
 * 3. Validated at the AST level (reuses the expression validator for defaults)
 * 4. Deparsed to canonical SQL text
 *
 * The key security insight: the structured model eliminates entire attack
 * categories by construction (no subqueries, no column refs, no stacked
 * statements). What remains is identifier validation + allowlist enforcement.
 */

import { deparseSync } from 'pgsql-deparser';
import { validateAst } from './validator';
import type { SqlExpressionValidatorOptions, AstValidationResult } from './validator';

// ─── Types ────────────────────────────────────────────────────────

/**
 * Structured representation of a PostgreSQL data type.
 *
 * @example Simple type
 * { name: "text" }
 *
 * @example Type with arguments
 * { name: "geometry", args: ["Point", 4326] }
 * { name: "numeric", args: [10, 2] }
 * { name: "vector", args: [1536] }
 *
 * @example Array type
 * { name: "text", array_dimensions: 1 }
 *
 * @example Schema-qualified type
 * { name: "my_type", schema: "my_schema" }
 *
 * @example Interval with field range
 * { name: "interval", range: ["day", "second"] }
 */
export interface FieldType {
  /** Type name (required). Must be a valid SQL identifier. */
  name: string;
  /** Schema qualifier (optional). Must be a valid SQL identifier. */
  schema?: string;
  /** Type arguments (optional). Each is a string identifier, number, or boolean. */
  args?: (string | number | boolean)[];
  /** Number of array dimensions (optional). 1 = `text[]`, 2 = `text[][]`. */
  array_dimensions?: number;
  /** Interval field range (optional). 1-2 elements: ["day"] or ["day", "second"]. */
  range?: string[];
}

/**
 * Argument to a function in a FieldDefault expression.
 * Can be a literal value or a nested FieldDefault (recursive).
 */
export type FieldDefaultArg = string | number | boolean | null | FieldDefault;

/**
 * Structured representation of a PostgreSQL default value expression.
 *
 * @example Literal values
 * { value: false }
 * { value: 0 }
 * { value: "pooled" }
 *
 * @example Cast expression
 * { value: "{}", cast: { name: "jsonb" } }
 * { value: "15 minutes", cast: { name: "interval" } }
 *
 * @example Simple function call
 * { function: "now" }
 * { function: "gen_random_uuid" }
 *
 * @example Schema-qualified function
 * { function: "current_user_id", schema: "jwt_public" }
 *
 * @example Function with arguments (nested)
 * { function: "encode", args: [{ function: "gen_random_bytes", args: [16] }, "hex"] }
 *
 * @example Function with cast
 * { function: "lpad", args: ["", 32, "0"], cast: { name: "bit", args: [32] } }
 */
export interface FieldDefault {
  /** Literal value (string, number, boolean, null, or array). */
  value?: string | number | boolean | null | unknown[];
  /** Function name. Must be a valid SQL identifier. */
  function?: string;
  /** Schema qualifier for function (optional). */
  schema?: string;
  /** Function arguments (optional, recursive). */
  args?: FieldDefaultArg[];
  /** Output type cast (optional). Reuses FieldType shape. */
  cast?: FieldType;
}

// ─── Validation Options ──────────────────────────────────────────

export interface FieldTypeValidationOptions {
  /** Allowed schemas for schema-qualified types. */
  allowedTypeSchemas?: string[];
  /** Additional forbidden type names beyond the built-in set. */
  additionalForbiddenTypes?: string[];
}

export interface FieldDefaultValidationOptions extends SqlExpressionValidatorOptions {
  /** Allowed schemas for schema-qualified types in casts. */
  allowedTypeSchemas?: string[];
  /** Additional forbidden type names beyond the built-in set. */
  additionalForbiddenTypes?: string[];
  /** Maximum nesting depth for recursive args. Defaults to 4. */
  maxNestingDepth?: number;
  /**
   * Map of schema → allowed functions for schema-qualified calls.
   * Functions in this map do NOT need to also appear in allowedFunctions.
   */
  allowedSchemaFunctions?: Record<string, string[]>;
}

export interface FieldTypeValidationResult {
  valid: boolean;
  /** Canonical SQL text (e.g., "geometry(Point,4326)", "text[]") */
  canonicalSql?: string;
  /** The TypeName AST node */
  ast?: Record<string, unknown>;
  error?: string;
}

export interface FieldDefaultValidationResult {
  valid: boolean;
  /** Canonical SQL text (e.g., "now()", "'{}'::jsonb") */
  canonicalSql?: string;
  /** The expression AST node */
  ast?: Record<string, unknown>;
  error?: string;
}

// ─── Constants ───────────────────────────────────────────────────

/** Valid SQL identifier pattern. */
const IDENTIFIER_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

/**
 * PostgreSQL system catalog type casts that are forbidden.
 * These OID-alias types can be used to probe the system catalog.
 * Shared with the expression validator (same list).
 */
export const FORBIDDEN_TYPES = new Set([
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

/**
 * Valid interval field qualifiers for the `range` property.
 */
const VALID_INTERVAL_FIELDS = new Set([
  'year', 'month', 'day', 'hour', 'minute', 'second'
]);

/** Allowed keys in a FieldType object. */
const FIELD_TYPE_KEYS = new Set(['name', 'schema', 'args', 'array_dimensions', 'range']);

/** Allowed keys in a FieldDefault object. */
const FIELD_DEFAULT_KEYS = new Set(['value', 'function', 'schema', 'args', 'cast']);

// ─── Internal: AST Builders ──────────────────────────────────────

/** Build a pgsql-parser String node. */
function astString(sval: string): Record<string, unknown> {
  return { String: { sval } };
}

/** Build a pgsql-parser A_Const node for an integer. */
function astConstInt(ival: number): Record<string, unknown> {
  return { A_Const: { ival: { ival } } };
}

/** Build a pgsql-parser A_Const node for a string. */
function astConstStr(sval: string): Record<string, unknown> {
  return { A_Const: { sval: { sval } } };
}

/** Build a pgsql-parser A_Const node for a boolean. */
function astConstBool(boolval: boolean): Record<string, unknown> {
  if (boolval) {
    return { A_Const: { boolval: { boolval: true } } };
  }
  return { A_Const: { boolval: {} } };
}

/** Build a pgsql-parser A_Const node for NULL. */
function astConstNull(): Record<string, unknown> {
  return { A_Const: { isnull: true } };
}

// ─── Converters: FieldType → AST ─────────────────────────────────

/**
 * Convert a FieldType to a pgsql-parser TypeName AST node.
 *
 * The TypeName node format:
 * {
 *   names: [{ String: { sval: "schema" } }, { String: { sval: "name" } }],
 *   typmods: [<arg AST nodes>],
 *   arrayBounds: [{ Integer: { ival: -1 } }, ...],
 *   typemod: -1
 * }
 */
export function fieldTypeToAst(ft: FieldType): Record<string, unknown> {
  const names: Record<string, unknown>[] = [];
  if (ft.schema) {
    names.push(astString(ft.schema));
  }
  names.push(astString(ft.name));

  const typeName: Record<string, unknown> = {
    names,
    typemod: -1
  };

  // Type arguments → typmods
  if (ft.args && ft.args.length > 0) {
    const typmods: Record<string, unknown>[] = [];
    for (const arg of ft.args) {
      if (typeof arg === 'number') {
        typmods.push(astConstInt(arg));
      } else if (typeof arg === 'string') {
        // String args in type modifiers are identifiers (e.g., "Point" in geometry(Point, 4326))
        // PostgreSQL parser represents these as ColumnRef nodes
        typmods.push({
          ColumnRef: {
            fields: [astString(arg.toLowerCase())]
          }
        });
      } else if (typeof arg === 'boolean') {
        typmods.push(astConstBool(arg));
      }
    }
    typeName.typmods = typmods;
  }

  // Array dimensions → arrayBounds
  if (ft.array_dimensions && ft.array_dimensions > 0) {
    const arrayBounds: Record<string, unknown>[] = [];
    for (let i = 0; i < ft.array_dimensions; i++) {
      arrayBounds.push({ Integer: { ival: -1 } });
    }
    typeName.arrayBounds = arrayBounds;
  }

  // Interval range is encoded as a numeric typmod by PostgreSQL.
  // We store it as readable strings; conversion to the numeric bitmask
  // happens in field_type_to_text() at the SQL layer.
  // For AST purposes, we skip typmods for interval range — the deparser
  // handles it via the INTERVAL keyword + field qualifiers.

  return typeName;
}

/**
 * Convert a FieldType to its canonical SQL text representation.
 *
 * Uses the deparser for the base type, then appends array brackets.
 * Handles interval range fields manually since the deparser needs
 * special handling for INTERVAL ... DAY TO SECOND syntax.
 */
export function fieldTypeToSql(ft: FieldType): string {
  // Build the base type string
  let sql = '';

  if (ft.schema) {
    sql += ft.schema + '.';
  }
  sql += ft.name;

  // Type arguments
  if (ft.args && ft.args.length > 0) {
    const argParts = ft.args.map(arg => {
      if (typeof arg === 'string') return arg;
      return String(arg);
    });
    sql += '(' + argParts.join(', ') + ')';
  }

  // Interval range
  if (ft.range && ft.range.length > 0 && ft.name.toLowerCase() === 'interval') {
    if (ft.range.length === 1) {
      sql += ' ' + ft.range[0];
    } else if (ft.range.length === 2) {
      sql += ' ' + ft.range[0] + ' to ' + ft.range[1];
    }
  }

  // Array dimensions
  if (ft.array_dimensions && ft.array_dimensions > 0) {
    for (let i = 0; i < ft.array_dimensions; i++) {
      sql += '[]';
    }
  }

  return sql;
}

// ─── Converters: FieldDefault → AST ─────────────────────────────

/**
 * Convert a FieldDefault to a pgsql-parser expression AST node.
 *
 * Handles:
 * - Literal values → A_Const
 * - Function calls → FuncCall (with recursive args)
 * - Type casts → TypeCast wrapping the inner expression
 * - Combinations (function + cast, value + cast)
 */
export function fieldDefaultToAst(fd: FieldDefault, depth: number = 0): Record<string, unknown> {
  if (depth > 10) {
    throw new Error('FieldDefault nesting exceeds maximum depth');
  }

  let expr: Record<string, unknown>;

  if (fd.function !== undefined) {
    // Function call
    const funcname: Record<string, unknown>[] = [];
    if (fd.schema) {
      funcname.push(astString(fd.schema));
    }
    funcname.push(astString(fd.function));

    const funcCall: Record<string, unknown> = {
      funcname,
      funcformat: 'COERCE_EXPLICIT_CALL'
    };

    // Function arguments
    if (fd.args && fd.args.length > 0) {
      const astArgs: Record<string, unknown>[] = [];
      for (const arg of fd.args) {
        astArgs.push(fieldDefaultArgToAst(arg, depth + 1));
      }
      funcCall.args = astArgs;
    }

    expr = { FuncCall: funcCall };
  } else if (fd.value !== undefined) {
    // Literal value
    expr = literalToAst(fd.value);
  } else {
    throw new Error('FieldDefault must have either "function" or "value"');
  }

  // Wrap in TypeCast if cast is present
  if (fd.cast) {
    expr = {
      TypeCast: {
        arg: expr,
        typeName: fieldTypeToAst(fd.cast)
      }
    };
  }

  return expr;
}

/**
 * Convert a FieldDefaultArg to an AST node.
 */
function fieldDefaultArgToAst(arg: FieldDefaultArg, depth: number): Record<string, unknown> {
  if (arg === null) {
    return astConstNull();
  }
  if (typeof arg === 'string') {
    return astConstStr(arg);
  }
  if (typeof arg === 'number') {
    if (Number.isInteger(arg)) {
      return astConstInt(arg);
    }
    // Float — represented as string in pgsql-parser
    return { A_Const: { fval: { fval: String(arg) } } };
  }
  if (typeof arg === 'boolean') {
    return astConstBool(arg);
  }
  // Nested FieldDefault object
  return fieldDefaultToAst(arg as FieldDefault, depth);
}

/**
 * Convert a literal value to an A_Const (or A_ArrayExpr) AST node.
 */
function literalToAst(value: string | number | boolean | null | unknown[]): Record<string, unknown> {
  if (value === null) {
    return astConstNull();
  }
  if (typeof value === 'string') {
    return astConstStr(value);
  }
  if (typeof value === 'number') {
    if (Number.isInteger(value)) {
      return astConstInt(value);
    }
    return { A_Const: { fval: { fval: String(value) } } };
  }
  if (typeof value === 'boolean') {
    return astConstBool(value);
  }
  if (Array.isArray(value)) {
    const elements = value.map(el => {
      if (el === null) return astConstNull();
      if (typeof el === 'string') return astConstStr(el);
      if (typeof el === 'number') {
        if (Number.isInteger(el)) return astConstInt(el);
        return { A_Const: { fval: { fval: String(el) } } };
      }
      if (typeof el === 'boolean') return astConstBool(el);
      throw new Error(`Unsupported array element type: ${typeof el}`);
    });
    return { A_ArrayExpr: { elements } };
  }
  throw new Error(`Unsupported literal type: ${typeof value}`);
}

/**
 * Convert a FieldDefault to its canonical SQL text representation.
 */
export function fieldDefaultToSql(fd: FieldDefault): string {
  const ast = fieldDefaultToAst(fd);
  return deparseSync([ast] as Parameters<typeof deparseSync>[0]);
}

// ─── Structural Validators ───────────────────────────────────────

/**
 * Validate a FieldType object structurally.
 *
 * Checks:
 * - Object shape (no unknown keys, required keys present)
 * - `name` is a valid SQL identifier
 * - `name` is not a forbidden type (regclass, regtype, etc.)
 * - `schema` (if present) is a valid SQL identifier and on the allowlist
 * - `args` elements are literals (string, number, boolean)
 * - `array_dimensions` is a positive integer
 * - `range` elements are valid interval field qualifiers
 *
 * Then converts to SQL text for canonical output.
 */
export function validateFieldType(
  ft: unknown,
  options: FieldTypeValidationOptions = {}
): FieldTypeValidationResult {
  const {
    allowedTypeSchemas = [],
    additionalForbiddenTypes = []
  } = options;

  // Must be a non-null object
  if (!ft || typeof ft !== 'object' || Array.isArray(ft)) {
    return { valid: false, error: 'FieldType must be a non-null object' };
  }

  const obj = ft as Record<string, unknown>;

  // No unknown keys
  for (const key of Object.keys(obj)) {
    if (!FIELD_TYPE_KEYS.has(key)) {
      return { valid: false, error: `Unknown FieldType key: "${key}"` };
    }
  }

  // name: required, valid identifier
  if (typeof obj.name !== 'string') {
    return { valid: false, error: 'FieldType.name is required and must be a string' };
  }
  if (!IDENTIFIER_PATTERN.test(obj.name)) {
    return {
      valid: false,
      error: `FieldType.name must be a valid SQL identifier, got: "${obj.name}"`
    };
  }

  // Forbidden types
  const nameLower = obj.name.toLowerCase();
  if (FORBIDDEN_TYPES.has(nameLower)) {
    return {
      valid: false,
      error: `Forbidden type: "${obj.name}" — system catalog OID-alias types are not allowed`
    };
  }
  for (const forbidden of additionalForbiddenTypes) {
    if (nameLower === forbidden.toLowerCase()) {
      return {
        valid: false,
        error: `Forbidden type: "${obj.name}"`
      };
    }
  }

  // schema: optional, valid identifier + allowlist
  if (obj.schema !== undefined) {
    if (typeof obj.schema !== 'string') {
      return { valid: false, error: 'FieldType.schema must be a string' };
    }
    if (!IDENTIFIER_PATTERN.test(obj.schema)) {
      return {
        valid: false,
        error: `FieldType.schema must be a valid SQL identifier, got: "${obj.schema}"`
      };
    }
    if (allowedTypeSchemas.length > 0) {
      const schemaLower = obj.schema.toLowerCase();
      if (!allowedTypeSchemas.some(s => s.toLowerCase() === schemaLower)) {
        return {
          valid: false,
          error: `Type schema "${obj.schema}" is not in the allowed schemas list`
        };
      }
    }
  }

  // args: optional, must be array of literals
  if (obj.args !== undefined) {
    if (!Array.isArray(obj.args)) {
      return { valid: false, error: 'FieldType.args must be an array' };
    }
    for (let i = 0; i < obj.args.length; i++) {
      const arg = obj.args[i];
      if (typeof arg !== 'string' && typeof arg !== 'number' && typeof arg !== 'boolean') {
        return {
          valid: false,
          error: `FieldType.args[${i}] must be a string, number, or boolean, got: ${typeof arg}`
        };
      }
      // String args must be valid identifiers (they become type modifiers)
      if (typeof arg === 'string' && !IDENTIFIER_PATTERN.test(arg)) {
        return {
          valid: false,
          error: `FieldType.args[${i}] string must be a valid identifier, got: "${arg}"`
        };
      }
    }
  }

  // array_dimensions: optional, positive integer
  if (obj.array_dimensions !== undefined) {
    if (typeof obj.array_dimensions !== 'number' || !Number.isInteger(obj.array_dimensions)) {
      return { valid: false, error: 'FieldType.array_dimensions must be an integer' };
    }
    if (obj.array_dimensions < 0 || obj.array_dimensions > 6) {
      return {
        valid: false,
        error: 'FieldType.array_dimensions must be between 0 and 6'
      };
    }
  }

  // range: optional, 1-2 valid interval field qualifiers
  if (obj.range !== undefined) {
    if (!Array.isArray(obj.range)) {
      return { valid: false, error: 'FieldType.range must be an array' };
    }
    if (obj.range.length < 1 || obj.range.length > 2) {
      return { valid: false, error: 'FieldType.range must have 1 or 2 elements' };
    }
    for (let i = 0; i < obj.range.length; i++) {
      const field = obj.range[i];
      if (typeof field !== 'string') {
        return {
          valid: false,
          error: `FieldType.range[${i}] must be a string`
        };
      }
      if (!VALID_INTERVAL_FIELDS.has(field.toLowerCase())) {
        return {
          valid: false,
          error: `FieldType.range[${i}] must be a valid interval field (year, month, day, hour, minute, second), got: "${field}"`
        };
      }
    }
    // range only makes sense on interval
    if (nameLower !== 'interval') {
      return {
        valid: false,
        error: 'FieldType.range is only valid for interval types'
      };
    }
  }

  // Generate canonical SQL and AST
  const typedFt = obj as unknown as FieldType;
  try {
    const ast = fieldTypeToAst(typedFt);
    const canonicalSql = fieldTypeToSql(typedFt);
    return { valid: true, canonicalSql, ast };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { valid: false, error: `Failed to convert FieldType to SQL: ${msg}` };
  }
}

/**
 * Validate a FieldDefault object.
 *
 * Structural validation + AST conversion + expression validation.
 *
 * 1. Validates the JSON structure (shape, types, required fields)
 * 2. Converts to pgsql-parser expression AST
 * 3. Validates the AST through the expression validator (function/schema allowlists)
 * 4. Deparses to canonical SQL text
 */
export function validateFieldDefault(
  fd: unknown,
  options: FieldDefaultValidationOptions = {}
): FieldDefaultValidationResult {
  const {
    maxNestingDepth = 4,
    allowedTypeSchemas = [],
    additionalForbiddenTypes = [],
    allowedSchemaFunctions = {},
    ...expressionOptions
  } = options;

  // Structural validation first
  const structResult = validateFieldDefaultStructure(
    fd, 0, maxNestingDepth, allowedTypeSchemas, additionalForbiddenTypes
  );
  if (!structResult.valid) {
    return structResult;
  }

  // Build merged options for the expression validator
  // Include schema-qualified functions in both allowedFunctions and allowedSchemas
  const mergedFunctions = [...(expressionOptions.allowedFunctions ?? [])];
  const mergedSchemas = [...(expressionOptions.allowedSchemas ?? [])];

  for (const [schema, funcs] of Object.entries(allowedSchemaFunctions)) {
    if (!mergedSchemas.some(s => s.toLowerCase() === schema.toLowerCase())) {
      mergedSchemas.push(schema);
    }
    for (const func of funcs) {
      if (!mergedFunctions.some(f => f.toLowerCase() === func.toLowerCase())) {
        mergedFunctions.push(func);
      }
    }
  }

  const mergedExpressionOptions: SqlExpressionValidatorOptions = {
    ...expressionOptions,
    allowedFunctions: mergedFunctions.length > 0 ? mergedFunctions : undefined,
    allowedSchemas: mergedSchemas.length > 0 ? mergedSchemas : undefined
  };

  // Convert to AST
  const typedFd = fd as FieldDefault;
  let ast: Record<string, unknown>;
  try {
    ast = fieldDefaultToAst(typedFd);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { valid: false, error: `Failed to convert FieldDefault to AST: ${msg}` };
  }

  // Validate the AST through the expression validator
  const astResult = validateAst(ast, mergedExpressionOptions);
  if (!astResult.valid) {
    return { valid: false, error: astResult.error };
  }

  return {
    valid: true,
    canonicalSql: astResult.canonicalText,
    ast
  };
}

/**
 * Recursively validate the structure of a FieldDefault object.
 */
function validateFieldDefaultStructure(
  fd: unknown,
  depth: number,
  maxDepth: number,
  allowedTypeSchemas: string[],
  additionalForbiddenTypes: string[]
): FieldDefaultValidationResult {
  if (depth > maxDepth) {
    return {
      valid: false,
      error: `FieldDefault nesting exceeds maximum depth of ${maxDepth}`
    };
  }

  if (!fd || typeof fd !== 'object' || Array.isArray(fd)) {
    return { valid: false, error: 'FieldDefault must be a non-null object' };
  }

  const obj = fd as Record<string, unknown>;

  // No unknown keys
  for (const key of Object.keys(obj)) {
    if (!FIELD_DEFAULT_KEYS.has(key)) {
      return { valid: false, error: `Unknown FieldDefault key: "${key}"` };
    }
  }

  // Must have either function or value (not both, not neither)
  const hasFunction = obj.function !== undefined;
  const hasValue = obj.value !== undefined;

  if (!hasFunction && !hasValue) {
    return { valid: false, error: 'FieldDefault must have either "function" or "value"' };
  }
  if (hasFunction && hasValue) {
    return { valid: false, error: 'FieldDefault cannot have both "function" and "value"' };
  }

  // schema without function is invalid
  if (obj.schema !== undefined && !hasFunction) {
    return { valid: false, error: 'FieldDefault.schema is only valid with "function"' };
  }

  // args without function is invalid
  if (obj.args !== undefined && !hasFunction) {
    return { valid: false, error: 'FieldDefault.args is only valid with "function"' };
  }

  if (hasFunction) {
    // function: must be valid identifier
    if (typeof obj.function !== 'string') {
      return { valid: false, error: 'FieldDefault.function must be a string' };
    }
    if (!IDENTIFIER_PATTERN.test(obj.function)) {
      return {
        valid: false,
        error: `FieldDefault.function must be a valid SQL identifier, got: "${obj.function}"`
      };
    }

    // schema: optional, valid identifier
    if (obj.schema !== undefined) {
      if (typeof obj.schema !== 'string') {
        return { valid: false, error: 'FieldDefault.schema must be a string' };
      }
      if (!IDENTIFIER_PATTERN.test(obj.schema)) {
        return {
          valid: false,
          error: `FieldDefault.schema must be a valid SQL identifier, got: "${obj.schema}"`
        };
      }
    }

    // args: optional, recursive
    if (obj.args !== undefined) {
      if (!Array.isArray(obj.args)) {
        return { valid: false, error: 'FieldDefault.args must be an array' };
      }
      for (let i = 0; i < obj.args.length; i++) {
        const arg = obj.args[i];
        if (arg === null || typeof arg === 'string' || typeof arg === 'number' || typeof arg === 'boolean') {
          continue; // Literal — valid
        }
        if (typeof arg === 'object') {
          // Nested FieldDefault
          const nestedResult = validateFieldDefaultStructure(
            arg, depth + 1, maxDepth, allowedTypeSchemas, additionalForbiddenTypes
          );
          if (!nestedResult.valid) {
            return {
              valid: false,
              error: `FieldDefault.args[${i}]: ${nestedResult.error}`
            };
          }
        } else {
          return {
            valid: false,
            error: `FieldDefault.args[${i}] must be a string, number, boolean, null, or FieldDefault object`
          };
        }
      }
    }
  }

  if (hasValue) {
    // value: must be string, number, boolean, null, or array
    const v = obj.value;
    if (v !== null && typeof v !== 'string' && typeof v !== 'number' && typeof v !== 'boolean' && !Array.isArray(v)) {
      return {
        valid: false,
        error: `FieldDefault.value must be a string, number, boolean, null, or array`
      };
    }
    if (Array.isArray(v)) {
      for (let i = 0; i < v.length; i++) {
        const el = v[i];
        if (el !== null && typeof el !== 'string' && typeof el !== 'number' && typeof el !== 'boolean') {
          return {
            valid: false,
            error: `FieldDefault.value[${i}] array elements must be string, number, boolean, or null`
          };
        }
      }
    }
  }

  // cast: optional, must be valid FieldType
  if (obj.cast !== undefined) {
    const castResult = validateFieldType(obj.cast, {
      allowedTypeSchemas,
      additionalForbiddenTypes
    });
    if (!castResult.valid) {
      return { valid: false, error: `FieldDefault.cast: ${castResult.error}` };
    }
  }

  return { valid: true };
}
