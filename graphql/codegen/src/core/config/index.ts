/**
 * Configuration module exports
 */

export {
  CONFIG_FILENAMES,
  CONFIG_FILENAME,
  JSON_CONFIG_FILENAME,
  findConfigFile,
  loadConfigFile,
  type LoadConfigFileErrorCode,
  type LoadConfigFileOptions,
  type LoadConfigFileResult,
} from './loader';
export {
  normalizeCodegenConfig,
  type ConfigValidationFailure,
  type NormalizedCodegenConfig,
} from './schema';
export {
  type ConfigOverrideOptions,
  loadAndResolveConfig,
  type LoadConfigResult,
  loadWatchConfig,
} from './resolver';
