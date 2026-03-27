/**
 * CLI utility functions for type coercion and input handling
 *
 * This is the RUNTIME code that gets copied to generated output.
 * Provides helpers for CLI commands: type coercion (string CLI args -> proper
 * GraphQL types), field filtering (strip extra minimist fields),
 * mutation input parsing, and select field parsing.
 *
 * NOTE: This file is read at codegen time and written to output.
 * Any changes here will affect all generated CLI utils.
 */

import objectPath from 'nested-obj';

export type FieldType =
  | 'string'
  | 'boolean'
  | 'int'
  | 'float'
  | 'json'
  | 'uuid'
  | 'enum';

export interface FieldSchema {
  [fieldName: string]: FieldType;
}

/**
 * Coerce CLI string arguments to their proper GraphQL types based on a field schema.
 * CLI args always arrive as strings from minimist, but GraphQL expects
 * Boolean, Int, Float, JSON, etc.
 */
export function coerceAnswers(
  answers: Record<string, unknown>,
  schema: FieldSchema,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...answers };

  for (const [key, value] of Object.entries(result)) {
    const fieldType = schema[key];
    if (!fieldType || value === undefined || value === null) continue;

    const strValue = String(value);

    // Empty strings become undefined for non-string types
    if (strValue === '' && fieldType !== 'string') {
      result[key] = undefined;
      continue;
    }

    switch (fieldType) {
      case 'boolean':
        if (typeof value === 'boolean') break;
        result[key] =
          strValue === 'true' || strValue === '1' || strValue === 'yes';
        break;
      case 'int':
        if (typeof value === 'number') break;
        {
          const parsed = parseInt(strValue, 10);
          result[key] = isNaN(parsed) ? undefined : parsed;
        }
        break;
      case 'float':
        if (typeof value === 'number') break;
        {
          const parsed = parseFloat(strValue);
          result[key] = isNaN(parsed) ? undefined : parsed;
        }
        break;
      case 'json':
        if (typeof value === 'object') break;
        if (strValue === '') {
          result[key] = undefined;
        } else {
          try {
            result[key] = JSON.parse(strValue);
          } catch {
            result[key] = undefined;
          }
        }
        break;
      case 'uuid':
        // Empty UUIDs become undefined
        if (strValue === '') {
          result[key] = undefined;
        }
        break;
      case 'enum':
        // Enums stay as strings but empty ones become undefined
        if (strValue === '') {
          result[key] = undefined;
        }
        break;
      default:
        // String type: empty strings also become undefined to avoid
        // sending empty strings for optional fields
        if (strValue === '') {
          result[key] = undefined;
        }
        break;
    }
  }

  return result;
}

/**
 * Strip undefined values and filter to only schema-defined keys.
 * This removes extra fields injected by minimist (like _, tty, etc.)
 * and any fields that were coerced to undefined.
 */
export function stripUndefined(
  obj: Record<string, unknown>,
  schema?: FieldSchema,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const allowedKeys = schema ? new Set(Object.keys(schema)) : null;

  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    if (allowedKeys && !allowedKeys.has(key)) continue;
    result[key] = value;
  }

  return result;
}

/**
 * Parse mutation input from CLI.
 * Custom mutation commands receive an `input` field as a JSON string
 * from the CLI prompt. This parses it into a proper object.
 */
export function parseMutationInput(
  answers: Record<string, unknown>,
): Record<string, unknown> {
  if (typeof answers.input === 'string') {
    try {
      const parsed = JSON.parse(answers.input);
      return { ...answers, input: parsed };
    } catch {
      return answers;
    }
  }
  return answers;
}

/**
 * Reconstruct nested objects from dot-notation CLI answers.
 * When INPUT_OBJECT args are flattened to dot-notation questions
 * (e.g. `--input.email foo --input.password bar`), this function
 * rebuilds the nested structure expected by the ORM:
 *
 *   { 'input.email': 'foo', 'input.password': 'bar' }
 *   → { input: { email: 'foo', password: 'bar' } }
 *
 * Non-dotted keys are passed through unchanged.
 * Uses `nested-obj` for safe nested property setting.
 */
export function unflattenDotNotation(
  answers: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(answers)) {
    if (key.includes('.')) {
      objectPath.set(result, key, value);
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Build a select object from a comma-separated list of dot-notation paths.
 * Uses `nested-obj` to parse paths like 'clientMutationId,result.accessToken,result.userId'
 * into the nested structure expected by the ORM:
 *
 *   { clientMutationId: true, result: { select: { accessToken: true, userId: true } } }
 *
 * Paths without dots set the key to `true` (scalar select).
 * Paths with dots create nested `{ select: { ... } }` wrappers, matching the
 * ORM's expected structure for OBJECT sub-fields (e.g. `SignUpPayloadSelect.result`).
 *
 * @param paths - Comma-separated dot-notation field paths (e.g. 'clientMutationId,result.accessToken')
 * @returns The nested select object for the ORM
 */
/**
 * Parse a CLI flag as an integer.
 * Handles minimist delivering numbers or strings depending on the input.
 * Returns undefined when the flag is missing or not a valid number.
 */
export function parseIntFlag(
  argv: Record<string, unknown>,
  name: string,
): number | undefined {
  const val = argv[name];
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const n = parseInt(val, 10);
    return isNaN(n) ? undefined : n;
  }
  return undefined;
}

/**
 * Parse a CLI flag as a string.
 * Returns undefined when the flag is missing or not a string.
 */
export function parseStringFlag(
  argv: Record<string, unknown>,
  name: string,
): string | undefined {
  const val = argv[name];
  return typeof val === 'string' ? val : undefined;
}

/**
 * Parse --orderBy flag as a comma-separated list of enum values.
 * e.g. --orderBy NAME_ASC,CREATED_AT_DESC → ['NAME_ASC', 'CREATED_AT_DESC']
 */
export function parseOrderByFlag(
  argv: Record<string, unknown>,
): string[] | undefined {
  const val = argv.orderBy;
  return typeof val === 'string' ? val.split(',') : undefined;
}

/**
 * Parse --fields flag into a select object, falling back to a default.
 * e.g. --fields id,name → { id: true, name: true }
 */
export function parseSelectFlag(
  argv: Record<string, unknown>,
  defaultSelect: Record<string, unknown>,
): Record<string, unknown> {
  const fields = argv.fields;
  return typeof fields === 'string'
    ? buildSelectFromPaths(fields)
    : defaultSelect;
}

/**
 * Build the full findManyArgs object from CLI argv.
 * Parses all pagination, filtering, ordering, and field selection flags
 * in one call.  Accepts an optional `extraWhere` to merge with dot-notation
 * --where flags (used by the search handler to inject search clauses).
 *
 * @example
 *   const findManyArgs = parseFindManyArgs(argv, { id: true, name: true });
 *   const result = await client.user.findMany(findManyArgs).execute();
 */
export function parseFindManyArgs(
  argv: Record<string, unknown>,
  defaultSelect: Record<string, unknown>,
  extraWhere?: Record<string, unknown>,
): Record<string, unknown> {
  const limit = parseIntFlag(argv, 'limit');
  const last = parseIntFlag(argv, 'last');
  const offset = parseIntFlag(argv, 'offset');
  const after = parseStringFlag(argv, 'after');
  const before = parseStringFlag(argv, 'before');
  const select = parseSelectFlag(argv, defaultSelect);
  const parsed = unflattenDotNotation(argv);
  const where = parsed.where ?? extraWhere
    ? { ...(extraWhere ?? {}), ...((parsed.where as Record<string, unknown>) ?? {}) }
    : undefined;
  const condition = parsed.condition;
  const orderBy = parseOrderByFlag(argv);

  return {
    select,
    ...(limit !== undefined ? { first: limit } : {}),
    ...(after !== undefined ? { after } : {}),
    ...(last !== undefined ? { last } : {}),
    ...(before !== undefined ? { before } : {}),
    ...(offset !== undefined ? { offset } : {}),
    ...(where !== undefined ? { where } : {}),
    ...(condition !== undefined ? { condition } : {}),
    ...(orderBy !== undefined ? { orderBy } : {}),
  };
}

/**
 * Build findFirst args from CLI argv.
 * Like parseFindManyArgs but only includes select, where, and condition
 * (no pagination flags — findFirst returns the first matching record).
 */
export function parseFindFirstArgs(
  argv: Record<string, unknown>,
  defaultSelect: Record<string, unknown>,
): Record<string, unknown> {
  const select = parseSelectFlag(argv, defaultSelect);
  const parsed = unflattenDotNotation(argv);
  const where = parsed.where;
  const condition = parsed.condition;

  return {
    select,
    ...(where !== undefined ? { where } : {}),
    ...(condition !== undefined ? { condition } : {}),
  };
}

export function buildSelectFromPaths(
  paths: string,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const trimmedPaths = paths
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  for (const path of trimmedPaths) {
    if (!path.includes('.')) {
      // Simple scalar field: clientMutationId -> { clientMutationId: true }
      result[path] = true;
    } else {
      // Nested path: result.accessToken -> { result: { select: { accessToken: true } } }
      // Convert dot-notation to ORM's { select: { ... } } nesting pattern
      const parts = path.split('.');
      let current = result;
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (i === parts.length - 1) {
          // Leaf node: set to true
          objectPath.set(current, part, true);
        } else {
          // Intermediate node: ensure { select: { ... } } wrapper exists
          if (!current[part] || typeof current[part] !== 'object') {
            current[part] = { select: {} };
          }
          const wrapper = current[part] as Record<string, unknown>;
          if (!wrapper.select || typeof wrapper.select !== 'object') {
            wrapper.select = {};
          }
          current = wrapper.select as Record<string, unknown>;
        }
      }
    }
  }

  return result;
}
