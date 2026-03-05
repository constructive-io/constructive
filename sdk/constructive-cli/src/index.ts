/**
 * @constructive-io/cli - Runtime utilities for building interactive CLI tools.
 *
 * This package provides the building blocks for creating command-line interfaces
 * using the Constructive CLI toolkit:
 *
 * - **inquirerer** for interactive prompts and argument parsing
 * - **appstash** for persistent configuration and credential storage
 * - **yanse** for terminal colors and formatting
 *
 * It is used as a runtime dependency by generated CLIs (via @constructive-io/graphql-codegen)
 * and can also be used directly to build custom CLI tools.
 */

// Config management
export { getAppDirs, getConfigStore } from './config';
export type { AppDirOptions } from './config';

// Command utilities
export { buildCommands, createSubcommandHandler } from './commands';
export type { CommandHandler, CommandDefinition } from './commands';

// CLI utilities for type coercion and input handling
export {
  coerceAnswers,
  stripUndefined,
  parseMutationInput,
  buildSelectFromPaths,
} from './utils';
export type { FieldType, FieldSchema } from './utils';

// Display utilities
export {
  printSuccess,
  printError,
  printWarning,
  printInfo,
  printKeyValue,
  printDetails,
  printTable,
} from './utils';

// Re-export key types from inquirerer for convenience
export type { CLI, CLIOptions, Inquirerer } from 'inquirerer';
export { extractFirst, getPackageJson } from 'inquirerer';
