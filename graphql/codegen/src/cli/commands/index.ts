/**
 * CLI commands exports
 */

export { initCommand, findConfigFile, loadConfigFile } from './init';
export type { InitOptions, InitResult } from './init';

// Unified generate function (recommended)
export { generate, generateReactQuery, generateOrm } from './generate-unified';
export type { GenerateOptions, GenerateResult, GenerateTargetResult, GeneratorType } from './generate-unified';

// Legacy exports (deprecated - use unified generate instead)
export { generateReactQuery as generateReactQueryLegacy } from './generate';
export { generateOrm as generateOrmLegacy } from './generate-orm';
export type { GenerateOrmOptions, GenerateOrmResult, GenerateOrmTargetResult } from './generate-orm';
