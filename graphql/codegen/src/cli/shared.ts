/**
 * Shared CLI utilities for graphql-codegen
 *
 * These are exported so that packages/cli can use the same questions,
 * types, and transform utilities, ensuring consistency between the two CLIs.
 */
import { camelize } from 'inflekt';
import { inflektTree } from 'inflekt/transform-keys';
import type { Question } from 'inquirerer';

import type { GenerateResult } from '../core/generate';
import { mergeConfig, type GraphQLSDKConfigTarget } from '../types/config';

export const splitCommas = (
  input: string | undefined,
): string[] | undefined => {
  if (!input) return undefined;
  return input
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
};

function normalizeListOption(
  input: unknown,
): string[] | undefined {
  if (Array.isArray(input)) {
    return input
      .flatMap((item) =>
        typeof item === 'string' ? (splitCommas(item) ?? []) : [String(item)],
      )
      .map((s) => s.trim())
      .filter(Boolean);
  }

  if (typeof input === 'string') {
    return splitCommas(input);
  }

  return undefined;
}

export interface CodegenAnswers {
  endpoint?: string;
  schemaFile?: string;
  output?: string;
  schemas?: string[];
  apiNames?: string[];
  reactQuery?: boolean;
  orm?: boolean;
  authorization?: string;
  dryRun?: boolean;
  verbose?: boolean;
}

export const codegenQuestions: Question[] = [
  {
    name: 'endpoint',
    message: 'GraphQL endpoint URL',
    type: 'text',
    required: false,
  },
  {
    name: 'schema-file',
    message: 'Path to GraphQL schema file',
    type: 'text',
    required: false,
  },
  {
    name: 'output',
    message: 'Output directory',
    type: 'text',
    required: false,
    default: 'codegen',
    useDefault: true,
  },
  {
    name: 'schemas',
    message: 'PostgreSQL schemas (comma-separated)',
    type: 'text',
    required: false,
    sanitize: splitCommas,
  },
  {
    name: 'api-names',
    message: 'API names (comma-separated)',
    type: 'text',
    required: false,
    sanitize: splitCommas,
  },
  {
    name: 'react-query',
    message: 'Generate React Query hooks?',
    type: 'confirm',
    required: false,
    default: false,
    useDefault: true,
  },
  {
    name: 'orm',
    message: 'Generate ORM client?',
    type: 'confirm',
    required: false,
    default: false,
    useDefault: true,
  },
  {
    name: 'authorization',
    message: 'Authorization header value',
    type: 'text',
    required: false,
  },
  {
    name: 'dry-run',
    message: 'Preview without writing files?',
    type: 'confirm',
    required: false,
    default: false,
    useDefault: true,
  },
  {
    name: 'verbose',
    message: 'Verbose output?',
    type: 'confirm',
    required: false,
    default: false,
    useDefault: true,
  },
];

export function printResult(result: GenerateResult): void {
  if (result.success) {
    console.log('[ok]', result.message);
    if (result.tables?.length) {
      console.log('Tables:', result.tables.join(', '));
    }
  } else {
    console.error('x', result.message);
    result.errors?.forEach((e) => console.error('  -', e));
    process.exit(1);
  }
}

// ============================================================================
// Key transform utilities
// ============================================================================

const isTopLevel = (_key: string, path: string[]) => path.length === 0;
const skipNonTopLevel = (key: string, path: string[]) =>
  !isTopLevel(key, path) || key === '_' || key.startsWith('_');

export const camelizeArgv = (argv: Record<string, any>): Record<string, any> =>
  inflektTree(
    argv,
    (key) => {
      const underscored = key.replace(/-/g, '_');
      return camelize(underscored, true);
    },
    { skip: skipNonTopLevel },
  );

export const hyphenateKeys = (obj: Record<string, any>): Record<string, any> =>
  inflektTree(
    obj,
    (key) => key.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase()),
    {
      skip: skipNonTopLevel,
    },
  );

// ============================================================================
// Config <-> CLI shape transforms
// ============================================================================

export function filterDefined(
  obj: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== null),
  );
}

export function flattenDbFields(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const { db, ...rest } = config;
  if (db && typeof db === 'object') {
    const dbObj = db as Record<string, unknown>;
    const schemas = Array.isArray(dbObj.schemas)
      ? dbObj.schemas.join(',')
      : dbObj.schemas;
    const apiNames = Array.isArray(dbObj.apiNames)
      ? dbObj.apiNames.join(',')
      : dbObj.apiNames;
    return { ...rest, schemas, apiNames };
  }
  return rest;
}

export function buildDbConfig(
  options: Record<string, unknown>,
): Record<string, unknown> {
  const { schemas, apiNames, ...rest } = options;
  if (schemas || apiNames) {
    return {
      ...rest,
      db: filterDefined({ schemas, apiNames } as Record<string, unknown>),
    };
  }
  return rest;
}

/**
 * Normalizes top-level list-like CLI options to string arrays.
 * This keeps non-interactive paths equivalent to prompt sanitize behavior.
 */
export function normalizeCodegenListOptions(
  options: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...options,
    schemas: normalizeListOption(options.schemas),
    apiNames: normalizeListOption(options.apiNames),
  };
}

/**
 * Returns true when source options are already available, so prompting can be skipped.
 */
export function hasResolvedCodegenSource(
  options: Record<string, unknown>,
): boolean {
  const normalized = normalizeCodegenListOptions(camelizeArgv(options));
  const db = normalized.db as Record<string, unknown> | undefined;
  const dbSchemas = normalizeListOption(db?.schemas);
  const dbApiNames = normalizeListOption(db?.apiNames);

  return Boolean(
    normalized.endpoint ||
      normalized.schemaFile ||
      (normalized.schemas as string[] | undefined)?.length ||
      (normalized.apiNames as string[] | undefined)?.length ||
      dbSchemas?.length ||
      dbApiNames?.length,
  );
}

export function seedArgvFromConfig(
  argv: Record<string, unknown>,
  fileConfig: GraphQLSDKConfigTarget,
): Record<string, unknown> {
  const flat = flattenDbFields(fileConfig as Record<string, unknown>);
  const hyphenated = hyphenateKeys(flat);
  const defined = filterDefined(hyphenated);
  return { ...defined, ...argv };
}

export function buildGenerateOptions(
  answers: Record<string, unknown>,
  fileConfig: GraphQLSDKConfigTarget = {},
): GraphQLSDKConfigTarget {
  const camelized = camelizeArgv(answers);
  const normalized = normalizeCodegenListOptions(camelized);
  const withDb = buildDbConfig(normalized);
  return mergeConfig(fileConfig, withDb as GraphQLSDKConfigTarget);
}
