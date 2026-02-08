/**
 * Shared CLI utilities for graphql-codegen
 * 
 * These are exported so that packages/cli can use the same questions
 * and types, ensuring consistency between the two CLIs.
 */
import { camelize } from 'inflekt';
import { inflektTree } from 'inflekt/transform-keys';
import type { Question } from 'inquirerer';

import type { GenerateResult } from '../core/generate';
import type { GraphQLSDKConfigTarget } from '../types/config';

/**
 * Sanitize function that splits comma-separated strings into arrays
 */
export const splitCommas = (input: string | undefined): string[] | undefined => {
  if (!input) return undefined;
  return input.split(',').map((s) => s.trim()).filter(Boolean);
};

/**
 * Interface for codegen CLI answers
 * CLI accepts kebab-case arguments, converted to camelCase for internal use
 */
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

export interface ParseCodegenCliArgsOptions {
  allowShortAliases?: boolean;
  resolveConfigFile?: () => string | undefined;
}

export interface ParsedCodegenCliArgs {
  endpoint?: string;
  schemaFile?: string;
  schemas?: string[];
  apiNames?: string[];
  reactQuery?: boolean;
  orm?: boolean;
  output?: string;
  authorization?: string;
  dryRun?: boolean;
  verbose?: boolean;
  configPath?: string;
  targetName?: string;
  hasSourceCliFlags: boolean;
  hasNonInteractiveArgs: boolean;
  cliOverrides: Partial<GraphQLSDKConfigTarget>;
}

type CliArgMap = Record<string, unknown>;

const getArgValue = (argv: CliArgMap, keys: string[]): unknown => {
  for (const key of keys) {
    if (argv[key] !== undefined) return argv[key];
  }
  return undefined;
};

const getStringArg = (argv: CliArgMap, keys: string[]): string | undefined => {
  const value = getArgValue(argv, keys);
  return typeof value === 'string' && value.length > 0 ? value : undefined;
};

const getBooleanArg = (argv: CliArgMap, keys: string[]): boolean | undefined => {
  const value = getArgValue(argv, keys);
  return value === true ? true : undefined;
};

const getListArg = (argv: CliArgMap, keys: string[]): string[] | undefined => {
  const value = getArgValue(argv, keys);
  if (Array.isArray(value)) {
    const normalized = value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean);
    return normalized.length > 0 ? normalized : undefined;
  }
  if (typeof value === 'string') return splitCommas(value);
  return undefined;
};

export const parseCodegenCliArgs = (
  argv: CliArgMap,
  options: ParseCodegenCliArgsOptions = {}
): ParsedCodegenCliArgs => {
  const allowShortAliases = options.allowShortAliases ?? false;

  const endpoint = getStringArg(argv, allowShortAliases ? ['endpoint', 'e'] : ['endpoint']);
  const schemaFile = getStringArg(
    argv,
    allowShortAliases ? ['schema-file', 'schemaFile', 's'] : ['schema-file', 'schemaFile']
  );
  const schemas = getListArg(argv, ['schemas']);
  const apiNames = getListArg(argv, ['api-names', 'apiNames']);
  const reactQuery = getBooleanArg(argv, ['react-query', 'reactQuery']);
  const orm = getBooleanArg(argv, ['orm']);
  const output = getStringArg(argv, allowShortAliases ? ['output', 'o'] : ['output']);
  const authorization = getStringArg(
    argv,
    allowShortAliases ? ['authorization', 'a'] : ['authorization']
  );
  const dryRun = getBooleanArg(argv, ['dry-run', 'dryRun']);
  const verbose = getBooleanArg(argv, allowShortAliases ? ['verbose', 'v'] : ['verbose']);

  const explicitConfigPath = getStringArg(
    argv,
    allowShortAliases ? ['config', 'c'] : ['config']
  );
  const targetName = getStringArg(argv, allowShortAliases ? ['target', 't'] : ['target']);
  const hasSourceCliFlags = Boolean(endpoint || schemaFile || schemas || apiNames);
  const autoConfigPath = !explicitConfigPath && !hasSourceCliFlags
    ? options.resolveConfigFile?.()
    : undefined;
  const configPath = explicitConfigPath || autoConfigPath;

  const cliOverrides: Partial<GraphQLSDKConfigTarget> = {};
  if (endpoint) {
    cliOverrides.endpoint = endpoint;
    cliOverrides.schemaFile = undefined;
    cliOverrides.db = undefined;
  }
  if (schemaFile) {
    cliOverrides.schemaFile = schemaFile;
    cliOverrides.endpoint = undefined;
    cliOverrides.db = undefined;
  }
  if (schemas || apiNames) {
    cliOverrides.db = { schemas, apiNames };
    cliOverrides.endpoint = undefined;
    cliOverrides.schemaFile = undefined;
  }
  if (reactQuery) cliOverrides.reactQuery = true;
  if (orm) cliOverrides.orm = true;
  if (verbose) cliOverrides.verbose = true;
  if (dryRun) cliOverrides.dryRun = true;
  if (output) cliOverrides.output = output;
  if (authorization) cliOverrides.authorization = authorization;

  const hasNonInteractiveArgs = Boolean(
    endpoint ||
      schemaFile ||
      schemas ||
      apiNames ||
      reactQuery ||
      orm ||
      output ||
      authorization ||
      dryRun ||
      verbose
  );

  return {
    endpoint,
    schemaFile,
    schemas,
    apiNames,
    reactQuery,
    orm,
    output,
    authorization,
    dryRun,
    verbose,
    configPath,
    targetName,
    hasSourceCliFlags,
    hasNonInteractiveArgs,
    cliOverrides
  };
};

/**
 * Questions for the codegen CLI
 */
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

/**
 * Print the result of a generate operation
 */
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

const isTopLevel = (_key: string, path: string[]) => path.length === 0;
export const camelizeArgv = (argv: Record<string, any>) =>
  inflektTree(argv, (key) => {
    // inflection.camelize expects underscores, so replace hyphens first
    const underscored = key.replace(/-/g, '_');
    return camelize(underscored, true);
  }, {
    skip: (key, path) =>
      !isTopLevel(key, path) ||
      key === '_' ||
      key.startsWith('_')
  });
