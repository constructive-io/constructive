/**
 * Configuration module exports
 */

export {
  CONFIG_FILENAME,
  findConfigFile,
  loadConfigFile,
  type LoadConfigFileResult,
} from './loader';

export {
  loadAndResolveConfig,
  loadWatchConfig,
  type ConfigOverrideOptions,
  type LoadConfigResult,
} from './resolver';
