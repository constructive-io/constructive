import { getGeneratedFileHeader } from '../utils';
import type { GeneratedFile } from './executor-generator';

/**
 * Generate a utils.ts file with runtime helpers for CLI commands.
 * Includes type coercion (string CLI args -> proper GraphQL types),
 * field filtering (strip extra minimist fields like _ and tty),
 * and mutation input parsing.
 */
export function generateUtilsFile(): GeneratedFile {
  const header = getGeneratedFileHeader(
    'CLI utility functions for type coercion and input handling',
  );

  const code = `
export type FieldType = 'string' | 'boolean' | 'int' | 'float' | 'json' | 'uuid' | 'enum';

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
        result[key] = strValue === 'true' || strValue === '1' || strValue === 'yes';
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
 * Custom mutation commands receive an \`input\` field as a JSON string
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
`;

  return {
    fileName: 'utils.ts',
    content: header + '\n' + code,
  };
}
