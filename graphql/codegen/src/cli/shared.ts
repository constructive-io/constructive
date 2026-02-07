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
import type { GraphQLSDKConfigTarget } from '../types/config';

export const splitCommas = (input: string | undefined): string[] | undefined => {
  if (!input) return undefined;
  return input.split(',').map((s) => s.trim()).filter(Boolean);
};

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
    required: false
  },
  {
    name: 'schema-file',
    message: 'Path to GraphQL schema file',
    type: 'text',
    required: false
  },
  {
    name: 'output',
    message: 'Output directory',
    type: 'text',
    required: false,
    default: 'codegen',
    useDefault: true
  },
  {
    name: 'schemas',
    message: 'PostgreSQL schemas (comma-separated)',
    type: 'text',
    required: false,
    sanitize: splitCommas
  },
  {
    name: 'api-names',
    message: 'API names (comma-separated)',
    type: 'text',
    required: false,
    sanitize: splitCommas
  },
  {
    name: 'react-query',
    message: 'Generate React Query hooks?',
    type: 'confirm',
    required: false,
    default: false,
    useDefault: true
  },
  {
    name: 'orm',
    message: 'Generate ORM client?',
    type: 'confirm',
    required: false,
    default: false,
    useDefault: true
  },
  {
    name: 'authorization',
    message: 'Authorization header value',
    type: 'text',
    required: false
  },
  {
    name: 'dry-run',
    message: 'Preview without writing files?',
    type: 'confirm',
    required: false,
    default: false,
    useDefault: true
  },
  {
    name: 'verbose',
    message: 'Verbose output?',
    type: 'confirm',
    required: false,
    default: false,
    useDefault: true
  }
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
  inflektTree(argv, (key) => {
    const underscored = key.replace(/-/g, '_');
    return camelize(underscored, true);
  }, { skip: skipNonTopLevel });

export const hyphenateKeys = (obj: Record<string, any>): Record<string, any> =>
  inflektTree(obj, (key) => key.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase()), {
    skip: skipNonTopLevel
  });

// ============================================================================
// Config <-> CLI shape transforms
// ============================================================================

export function filterDefined(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== null)
  );
}

export function flattenDbFields(config: Record<string, unknown>): Record<string, unknown> {
  const { db, ...rest } = config;
  if (db && typeof db === 'object') {
    const dbObj = db as Record<string, unknown>;
    const schemas = Array.isArray(dbObj.schemas) ? dbObj.schemas.join(',') : dbObj.schemas;
    const apiNames = Array.isArray(dbObj.apiNames) ? dbObj.apiNames.join(',') : dbObj.apiNames;
    return { ...rest, schemas, apiNames };
  }
  return rest;
}

export function buildDbConfig(options: Record<string, unknown>): Record<string, unknown> {
  const { schemas, apiNames, ...rest } = options;
  if (schemas || apiNames) {
    return { ...rest, db: { schemas, apiNames } };
  }
  return rest;
}

export function seedArgvFromConfig(
  argv: Record<string, unknown>,
  fileConfig: GraphQLSDKConfigTarget
): Record<string, unknown> {
  const flat = flattenDbFields(fileConfig as Record<string, unknown>);
  const hyphenated = hyphenateKeys(flat);
  const defined = filterDefined(hyphenated);
  return { ...defined, ...argv };
}

export function buildGenerateOptions(
  answers: Record<string, unknown>,
  fileConfig: GraphQLSDKConfigTarget = {}
): GraphQLSDKConfigTarget {
  const camelized = camelizeArgv(answers);
  const withDb = buildDbConfig(camelized);
  return { ...fileConfig, ...withDb } as GraphQLSDKConfigTarget;
}
