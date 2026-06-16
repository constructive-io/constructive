import type { JsonSchema } from 'agentic-kit';

export class DecisionValidationError extends Error {
  readonly toolName: string;
  readonly errors: string[];
  constructor(toolName: string, errors: string[]) {
    super(`Decision validation failed for tool '${toolName}':\n${errors.map((e) => `- ${e}`).join('\n')}`);
    this.name = 'DecisionValidationError';
    this.toolName = toolName;
    this.errors = errors;
  }
}

export function validateToolArguments(
  schema: JsonSchema,
  args: Record<string, unknown>
): Record<string, unknown> {
  const errors = validateSchema(schema, args, 'root');
  if (errors.length === 0) {
    return args;
  }

  throw new Error(`Tool argument validation failed:\n${errors.map((error) => `- ${error}`).join('\n')}`);
}

export function validateSchema(schema: JsonSchema, value: unknown, path: string): string[] {
  if (!schema || Object.keys(schema).length === 0) {
    return [];
  }

  const errors: string[] = [];
  const types = Array.isArray(schema.type) ? schema.type : schema.type ? [schema.type] : [];

  if (types.length > 0 && !types.some((type) => matchesType(type, value))) {
    errors.push(`${path} should be ${types.join(' | ')}`);
    return errors;
  }

  if (schema.enum && !schema.enum.some((candidate) => deepEqual(candidate, value))) {
    errors.push(`${path} must be one of ${schema.enum.map(String).join(', ')}`);
  }

  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(`${path} must have length >= ${schema.minLength}`);
    }
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      errors.push(`${path} must have length <= ${schema.maxLength}`);
    }
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
      errors.push(`${path} must match pattern ${schema.pattern}`);
    }
  }

  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push(`${path} must be >= ${schema.minimum}`);
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push(`${path} must be <= ${schema.maximum}`);
    }
  }

  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push(`${path} must contain at least ${schema.minItems} items`);
    }
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      errors.push(`${path} must contain at most ${schema.maxItems} items`);
    }

    if (schema.items && !Array.isArray(schema.items)) {
      value.forEach((item, index) => {
        errors.push(...validateSchema(schema.items as JsonSchema, item, `${path}[${index}]`));
      });
    }
  }

  if (isPlainObject(value)) {
    const properties = schema.properties ?? {};
    const required = schema.required ?? [];

    for (const key of required) {
      if (!(key in value)) {
        errors.push(`${path}.${key} is required`);
      }
    }

    for (const [key, childSchema] of Object.entries(properties)) {
      if (key in value) {
        errors.push(...validateSchema(childSchema, (value as Record<string, unknown>)[key], `${path}.${key}`));
      }
    }

    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!(key in properties)) {
          errors.push(`${path}.${key} is not allowed`);
        }
      }
    }
  }

  return errors;
}

function matchesType(type: string, value: unknown): boolean {
  switch (type) {
  case 'array':
    return Array.isArray(value);
  case 'boolean':
    return typeof value === 'boolean';
  case 'integer':
    return typeof value === 'number' && Number.isInteger(value);
  case 'null':
    return value === null;
  case 'number':
    return typeof value === 'number';
  case 'object':
    return isPlainObject(value);
  case 'string':
    return typeof value === 'string';
  default:
    return true;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
