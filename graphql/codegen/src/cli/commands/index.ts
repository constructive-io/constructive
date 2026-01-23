/**
 * CLI commands exports
 *
 * Public API:
 * - generate() - Unified generate function that respects config.reactQuery.enabled and config.orm.enabled
 * - findConfigFile() - Find config file in directory
 * - loadConfigFile() - Load and parse config file
 *
 * Internal (not exported from package):
 * - generateReactQuery() - Convenience wrapper for generate({ reactQuery: true, orm: false })
 * - generateOrm() - Convenience wrapper for generate({ reactQuery: false, orm: true })
 */

export { initCommand, findConfigFile, loadConfigFile } from './init';
export type { InitOptions, InitResult } from './init';

// Unified generate function (public API)
export { generate } from './generate-unified';
export type { GenerateOptions, GenerateResult, GenerateTargetResult, GeneratorType } from './generate-unified';

// Legacy exports (deprecated - use unified generate instead)
export { generateReactQuery as generateReactQueryLegacy } from './generate';
export { generateOrm as generateOrmLegacy } from './generate-orm';
export type { GenerateOrmOptions, GenerateOrmResult, GenerateOrmTargetResult } from './generate-orm';
