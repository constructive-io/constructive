/**
 * Shared CLI utilities for graphql-codegen
 * 
 * These are exported so that packages/cli can use the same questions
 * and types, ensuring consistency between the two CLIs.
 */
import type { Question } from 'inquirerer';
import type { GenerateResult } from '../core/generate';

/**
 * Sanitize function that splits comma-separated strings into arrays
 */
export const splitCommas = (input: string | undefined): string[] | undefined => {
  if (!input) return undefined;
  return input.split(',').map((s) => s.trim()).filter(Boolean);
};

/**
 * Interface for codegen CLI answers (supports both kebab-case and camelCase)
 * CLI uses kebab-case, internal code uses camelCase
 */
export interface CodegenAnswers {
  endpoint?: string;
  'schema-file'?: string;
  schemaFile?: string;
  output?: string;
  schemas?: string[];
  'api-names'?: string[];
  apiNames?: string[];
  'react-query'?: boolean;
  reactQuery?: boolean;
  orm?: boolean;
  'browser-compatible'?: boolean;
  browserCompatible?: boolean;
  authorization?: string;
  'dry-run'?: boolean;
  dryRun?: boolean;
  verbose?: boolean;
}

/**
 * Converts kebab-case CLI arguments to camelCase for internal use.
 * Supports both kebab-case (preferred) and camelCase (backward compatibility).
 * 
 * @param argv - Parsed CLI arguments from minimist
 * @returns Normalized object with camelCase properties
 */
export function convertArgvToInternal(argv: CodegenAnswers): CodegenAnswers {
  return {
    endpoint: argv.endpoint,
    schemaFile: argv['schema-file'] || argv.schemaFile,
    output: argv.output,
    schemas: argv.schemas,
    apiNames: argv['api-names'] || argv.apiNames,
    reactQuery: argv['react-query'] || argv.reactQuery || false,
    orm: argv.orm || false,
    browserCompatible: argv['browser-compatible'] || argv.browserCompatible || false,
    authorization: argv.authorization,
    dryRun: argv['dry-run'] || argv.dryRun || false,
    verbose: argv.verbose || false,
  };
}

/**
 * Questions for the codegen CLI
 */
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
    name: 'browser-compatible',
    message: 'Generate browser-compatible code?',
    type: 'confirm',
    required: false,
    default: true,
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
