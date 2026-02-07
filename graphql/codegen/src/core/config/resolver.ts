/**
 * Configuration resolution utilities
 *
 * Functions for resolving and merging configuration from various sources
 * (config file, CLI options, defaults) into a final resolved configuration.
 */
import type {
  GraphQLSDKConfig,
  GraphQLSDKConfigTarget
} from '../../types/config';
import { getConfigOptions,mergeConfig } from '../../types/config';
import { findConfigFile, loadConfigFile } from './loader';

/**
 * Options that can override config file settings.
 * Extends GraphQLSDKConfigTarget with CLI-specific fields.
 */
export interface ConfigOverrideOptions extends GraphQLSDKConfigTarget {
  /** Path to config file (CLI-only) */
  config?: string;
}

/**
 * Result of loading and resolving configuration
 */
export interface LoadConfigResult {
  success: boolean;
  config?: GraphQLSDKConfigTarget;
  error?: string;
}

/**
 * Load and resolve configuration from file and/or options
 *
 * This is the main entry point for configuration loading. It:
 * 1. Finds and loads the config file (if any)
 * 2. Applies CLI option overrides
 * 3. Returns fully resolved configuration ready for use
 */
export async function loadAndResolveConfig(
  options: ConfigOverrideOptions
): Promise<LoadConfigResult> {
  // Destructure CLI-only fields, rest is config overrides
  const { config: configPath, ...overrides } = options;

  // Validate that at most one source is specified
  const sources = [
    overrides.endpoint,
    overrides.schemaFile,
    overrides.db
  ].filter(Boolean);
  if (sources.length > 1) {
    return {
      success: false,
      error:
        'Multiple sources specified. Use only one of: endpoint, schemaFile, or db.'
    };
  }

  // Find config file
  let resolvedConfigPath = configPath;
  if (!resolvedConfigPath) {
    resolvedConfigPath = findConfigFile() ?? undefined;
  }

  let baseConfig: GraphQLSDKConfig = {};

  if (resolvedConfigPath) {
    const loadResult = await loadConfigFile(resolvedConfigPath);
    if (!loadResult.success) {
      return { success: false, error: loadResult.error };
    }
    baseConfig = loadResult.config;
  }

  const mergedConfig = mergeConfig(baseConfig, overrides);

  // Check if we have a source (endpoint, schemaFile, or db)
  const hasSource =
    mergedConfig.endpoint ||
    mergedConfig.schemaFile ||
    mergedConfig.db;

  if (!hasSource) {
    return {
      success: false,
      error:
        'No source specified. Use --endpoint, --schema-file, or --db, or create a config file with "graphql-codegen init".'
    };
  }

  return {
    success: true,
    config: getConfigOptions(mergedConfig)
  };
}

/**
 * Build watch configuration from options
 *
 * Used by watch mode to resolve configuration with watch-specific overrides.
 */
export async function loadWatchConfig(options: {
  config?: string;
  endpoint?: string;
  output?: string;
  pollInterval?: number;
  debounce?: number;
  touch?: string;
  clear?: boolean;
}): Promise<GraphQLSDKConfigTarget | null> {
  let configPath = options.config;
  if (!configPath) {
    configPath = findConfigFile() ?? undefined;
  }

  let baseConfig: GraphQLSDKConfig = {};

  if (configPath) {
    const loadResult = await loadConfigFile(configPath);
    if (!loadResult.success) {
      console.error('x', loadResult.error);
      return null;
    }
    baseConfig = loadResult.config;
  }

  const sourceOverrides: GraphQLSDKConfigTarget = {};
  if (options.endpoint) {
    sourceOverrides.endpoint = options.endpoint;
    sourceOverrides.schemaFile = undefined;
  }

  const watchOverrides: GraphQLSDKConfigTarget = {
    watch: {
      ...(options.pollInterval !== undefined && {
        pollInterval: options.pollInterval
      }),
      ...(options.debounce !== undefined && { debounce: options.debounce }),
      ...(options.touch !== undefined && { touchFile: options.touch }),
      ...(options.clear !== undefined && { clearScreen: options.clear })
    }
  };

  let mergedConfig = mergeConfig(baseConfig, sourceOverrides);
  mergedConfig = mergeConfig(mergedConfig, watchOverrides);

  if (!mergedConfig.endpoint) {
    console.error(
      'x No endpoint specified. Watch mode only supports live endpoints.'
    );
    return null;
  }

  if (mergedConfig.schemaFile) {
    console.error(
      'x Watch mode is only supported with an endpoint, not schemaFile.'
    );
    return null;
  }

  return getConfigOptions(mergedConfig);
}
