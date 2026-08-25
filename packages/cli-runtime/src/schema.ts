import { TSchema } from '@sinclair/typebox';
import Ajv2020, { ErrorObject, ValidateFunction } from 'ajv/dist/2020.js';

import { ContractError } from './errors';

export interface SchemaIssue {
  path: string;
  keyword: string;
  message: string;
  params: Record<string, unknown>;
}

export interface SchemaValidator<T = unknown> {
  readonly schema: TSchema;
  validate(value: unknown): value is T;
  issues(): SchemaIssue[];
}

function toIssues(errors: ErrorObject[] | null | undefined): SchemaIssue[] {
  return (errors ?? []).map((error) => ({
    path: error.instancePath || '/',
    keyword: error.keyword,
    message: error.message ?? 'is invalid',
    params: error.params as Record<string, unknown>,
  }));
}

export function createAjv(): Ajv2020 {
  return new Ajv2020({
    allErrors: true,
    strict: true,
    strictSchema: true,
    validateFormats: false,
    allowUnionTypes: true,
  });
}

export function compileSchema<T = unknown>(
  schema: TSchema,
  ajv = createAjv()
): SchemaValidator<T> {
  let compiled: ValidateFunction;
  try {
    compiled = ajv.compile(schema);
  } catch (error) {
    throw new ContractError(
      'CLI_SCHEMA_INVALID',
      error instanceof Error
        ? error.message
        : 'The JSON Schema could not be compiled.',
      { schema }
    );
  }

  return {
    schema,
    validate(value: unknown): value is T {
      return Boolean(compiled(value));
    },
    issues(): SchemaIssue[] {
      return toIssues(compiled.errors);
    },
  };
}

export function cloneSchema<T extends TSchema>(schema: T): T {
  return JSON.parse(JSON.stringify(schema)) as T;
}

/** Rejects values which JSON.stringify would silently drop or alter. */
export function assertJsonValue(
  value: unknown,
  path = '/',
  ancestors = new WeakSet<object>()
): void {
  if (value === null || typeof value === 'string' || typeof value === 'boolean')
    return;
  if (typeof value === 'number') {
    if (Number.isFinite(value)) return;
    throw new ContractError(
      'CLI_JSON_VALUE_INVALID',
      `Non-finite number at ${path} cannot cross the CLI protocol.`
    );
  }
  if (typeof value !== 'object') {
    throw new ContractError(
      'CLI_JSON_VALUE_INVALID',
      `Value at ${path} cannot cross the CLI protocol.`,
      {
        type: typeof value,
      }
    );
  }
  if (ancestors.has(value)) {
    throw new ContractError(
      'CLI_JSON_VALUE_INVALID',
      `Circular value at ${path} cannot cross the CLI protocol.`
    );
  }
  ancestors.add(value);
  if (Array.isArray(value)) {
    const enumerableSymbols = Object.getOwnPropertySymbols(value).filter(
      (key) => Object.getOwnPropertyDescriptor(value, key)?.enumerable === true
    );
    if (enumerableSymbols.length > 0) {
      throw new ContractError(
        'CLI_JSON_VALUE_INVALID',
        `Symbol properties at ${path} cannot cross the CLI protocol.`
      );
    }
    for (let index = 0; index < value.length; index += 1) {
      if (!Object.prototype.hasOwnProperty.call(value, index)) {
        throw new ContractError(
          'CLI_JSON_VALUE_INVALID',
          `Sparse array slot at ${path === '/' ? '' : path}/${index} cannot cross the CLI protocol.`
        );
      }
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (descriptor === undefined || !('value' in descriptor)) {
        throw new ContractError(
          'CLI_JSON_VALUE_INVALID',
          `Accessor array slot at ${path === '/' ? '' : path}/${index} cannot cross the CLI protocol.`
        );
      }
      assertJsonValue(
        descriptor.value,
        `${path === '/' ? '' : path}/${index}`,
        ancestors
      );
    }
    const extraKeys = Object.keys(value).filter(
      (key) => !/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= value.length
    );
    if (extraKeys.length > 0) {
      throw new ContractError(
        'CLI_JSON_VALUE_INVALID',
        `Enumerable array properties at ${path} cannot cross the CLI protocol.`,
        { keys: extraKeys }
      );
    }
  } else {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new ContractError(
        'CLI_JSON_VALUE_INVALID',
        `Non-plain object at ${path} cannot cross the CLI protocol.`
      );
    }
    const enumerableSymbols = Object.getOwnPropertySymbols(value).filter(
      (key) => Object.getOwnPropertyDescriptor(value, key)?.enumerable === true
    );
    if (enumerableSymbols.length > 0) {
      throw new ContractError(
        'CLI_JSON_VALUE_INVALID',
        `Symbol properties at ${path} cannot cross the CLI protocol.`
      );
    }
    for (const key of Object.keys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor === undefined || !('value' in descriptor)) {
        throw new ContractError(
          'CLI_JSON_VALUE_INVALID',
          `Accessor property at ${path} cannot cross the CLI protocol.`,
          {
            key,
          }
        );
      }
      const escaped = key.replace(/~/g, '~0').replace(/\//g, '~1');
      assertJsonValue(
        descriptor.value,
        `${path === '/' ? '' : path}/${escaped}`,
        ancestors
      );
    }
  }
  ancestors.delete(value);
}
