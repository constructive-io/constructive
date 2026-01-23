/**
 * Configuration resolution utilities
 *
 * Functions for resolving and merging configuration from various sources
 * (config file, CLI options, defaults) into a final resolved configuration.
 */
import type {
  GraphQLSDKConfig,
  GraphQLSDKConfigTarget,
  GraphQLSDKMultiConfig,
  TargetConfig,
} from '../../types/config';
import { isMultiConfig, mergeConfig, getConfigOptions } from '../../types/config';
import { findConfigFile, loadConfigFile } from './loader';

/**
 * Options that can override config file settings.
 * Extends GraphQLSDKConfigTarget with CLI-specific fields.
 * 
 * This is the same as GenerateOptions - both extend GraphQLSDKConfigTarget
 * with config and target fields for CLI usage.
 */
export interface ConfigOverrideOptions extends GraphQLSDKConfigTarget {
  /** Path to config file (CLI-only) */
  config?: string;
  /** Named target in a multi-target config (CLI-only) */
  target?: string;
}

/**
 * Result of loading and resolving configuration
 */
export interface LoadConfigResult {
  success: boolean;
  targets?: TargetConfig[];
  isMulti?: boolean;
  error?: string;
}

/**
 * Load and resolve configuration from file and/or options
 *
 * This is the main entry point for configuration loading. It:
 * 1. Finds and loads the config file (if any)
 * 2. Applies CLI option overrides
 * 3. Resolves multi-target or single-target configurations
 * 4. Returns fully resolved configuration ready for use
 */
export async function loadAndResolveConfig(
  options: ConfigOverrideOptions
): Promise<LoadConfigResult> {
  // Destructure CLI-only fields, rest is config overrides
  const { config: configPath, target: targetName, ...overrides } = options;

  // Validate that at most one source is specified
  const sources = [
    overrides.endpoint,
    overrides.schemaFile,
    overrides.db,
  ].filter(Boolean);
  if (sources.length > 1) {
    return {
      success: false,
      error:
        'Multiple sources specified. Use only one of: endpoint, schemaFile, or db.',
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

  if (isMultiConfig(baseConfig)) {
    return resolveMultiTargetConfig(baseConfig, targetName, overrides);
  }

  return resolveSingleTargetConfig(baseConfig as GraphQLSDKConfigTarget, targetName, overrides);
}

/**
 * Resolve a multi-target configuration
 */
function resolveMultiTargetConfig(
  baseConfig: GraphQLSDKMultiConfig,
  targetName: string | undefined,
  overrides: GraphQLSDKConfigTarget
): LoadConfigResult {
  if (Object.keys(baseConfig.targets).length === 0) {
    return {
      success: false,
      error: 'Config file defines no targets.',
    };
  }

  if (
    !targetName &&
    (overrides.endpoint || overrides.schemaFile || overrides.db || overrides.output)
  ) {
    return {
      success: false,
      error:
        'Multiple targets configured. Use --target with source or output overrides.',
    };
  }

  if (targetName && !baseConfig.targets[targetName]) {
    return {
      success: false,
      error: `Target "${targetName}" not found in config file.`,
    };
  }

  const selectedTargets = targetName
    ? { [targetName]: baseConfig.targets[targetName] }
    : baseConfig.targets;
  const defaults = baseConfig.defaults ?? {};
  const resolvedTargets: TargetConfig[] = [];

  for (const [name, target] of Object.entries(selectedTargets)) {
    let mergedTarget = mergeConfig(defaults, target);
    if (targetName && name === targetName) {
      mergedTarget = mergeConfig(mergedTarget, overrides);
    }

    const hasSource =
      mergedTarget.endpoint ||
      mergedTarget.schemaFile ||
      mergedTarget.db;

    if (!hasSource) {
      return {
        success: false,
        error: `Target "${name}" is missing a source (endpoint, schemaFile, or db).`,
      };
    }

    resolvedTargets.push({
      name,
      config: getConfigOptions(mergedTarget),
    });
  }

  return {
    success: true,
    targets: resolvedTargets,
    isMulti: true,
  };
}

/**
 * Resolve a single-target configuration
 */
function resolveSingleTargetConfig(
  baseConfig: GraphQLSDKConfigTarget,
  targetName: string | undefined,
  overrides: GraphQLSDKConfigTarget
): LoadConfigResult {
  if (targetName) {
    return {
      success: false,
      error:
        'Config file does not define targets. Remove --target to continue.',
    };
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
        'No source specified. Use --endpoint, --schema-file, or --db, or create a config file with "graphql-codegen init".',
    };
  }

  return {
    success: true,
    targets: [{ name: 'default', config: getConfigOptions(mergedConfig) }],
    isMulti: false,
  };
}

/**
 * Build watch configuration from options
 *
 * Used by watch mode to resolve configuration with watch-specific overrides.
 */
export async function loadWatchConfig(options: {
  config?: string;
  target?: string;
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

  if (isMultiConfig(baseConfig)) {
    if (!options.target) {
      console.error(
        'x Watch mode requires --target when using multiple targets.'
      );
      return null;
    }

    if (!baseConfig.targets[options.target]) {
      console.error(`x Target "${options.target}" not found in config file.`);
      return null;
    }
  } else if (options.target) {
    console.error('x Config file does not define targets. Remove --target.');
    return null;
  }

  const sourceOverrides: GraphQLSDKConfigTarget = {};
  if (options.endpoint) {
    sourceOverrides.endpoint = options.endpoint;
    sourceOverrides.schemaFile = undefined;
  }

  const watchOverrides: GraphQLSDKConfigTarget = {
    watch: {
      ...(options.pollInterval !== undefined && {
        pollInterval: options.pollInterval,
      }),
      ...(options.debounce !== undefined && { debounce: options.debounce }),
      ...(options.touch !== undefined && { touchFile: options.touch }),
      ...(options.clear !== undefined && { clearScreen: options.clear }),
    },
  };

  let mergedTarget: GraphQLSDKConfigTarget;

  if (isMultiConfig(baseConfig)) {
    const defaults = baseConfig.defaults ?? {};
    const targetConfig = baseConfig.targets[options.target!];
    mergedTarget = mergeConfig(defaults, targetConfig);
  } else {
    mergedTarget = baseConfig;
  }

  mergedTarget = mergeConfig(mergedTarget, sourceOverrides);
  mergedTarget = mergeConfig(mergedTarget, watchOverrides);

  if (!mergedTarget.endpoint) {
    console.error(
      'x No endpoint specified. Watch mode only supports live endpoints.'
    );
    return null;
  }

  if (mergedTarget.schemaFile) {
    console.error(
      'x Watch mode is only supported with an endpoint, not schemaFile.'
    );
    return null;
  }

  return getConfigOptions(mergedTarget);
}
