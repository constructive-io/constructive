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
  ResolvedConfig,
  ResolvedTargetConfig,
} from '../../types/config';
import { isMultiConfig, mergeConfig, resolveConfig } from '../../types/config';
import { findConfigFile, loadConfigFile } from './loader';

/**
 * Options that can override config file settings
 */
export interface ConfigOverrideOptions {
  /** Path to config file */
  config?: string;
  /** Named target in a multi-target config */
  target?: string;
  /** GraphQL endpoint URL (overrides config) */
  endpoint?: string;
  /** Path to GraphQL schema file (.graphql) */
  schema?: string;
  /** Database name or connection string (for database introspection) */
  database?: string;
  /** Path to a PGPM module directory (for module introspection) */
  pgpmModulePath?: string;
  /** Path to a PGPM workspace directory (used with pgpmModuleName) */
  pgpmWorkspacePath?: string;
  /** Name of the module within the workspace (used with pgpmWorkspacePath) */
  pgpmModuleName?: string;
  /** PostgreSQL schemas to include (for database and pgpm module modes) - mutually exclusive with apiNames */
  schemas?: string[];
  /** API names to resolve schemas from (for database and pgpm module modes) - mutually exclusive with schemas */
  apiNames?: string[];
  /** Keep the ephemeral database after introspection (for debugging, pgpm module mode only) */
  keepDb?: boolean;
  /** Output directory (overrides config) */
  output?: string;
}

/**
 * Result of loading and resolving configuration
 */
export interface LoadConfigResult {
  success: boolean;
  targets?: ResolvedTargetConfig[];
  isMulti?: boolean;
  error?: string;
}

/**
 * Build target overrides from CLI options
 *
 * Note: Validation that only one source is specified happens in loadAndResolveConfig,
 * so we don't need to clear other source fields here.
 */
export function buildTargetOverrides(
  options: ConfigOverrideOptions
): GraphQLSDKConfigTarget {
  const overrides: GraphQLSDKConfigTarget = {};

  if (options.endpoint) {
    overrides.endpoint = options.endpoint;
  }

  if (options.schema) {
    overrides.schema = options.schema;
  }

  if (options.database) {
    overrides.database = options.database;
  }

  if (options.pgpmModulePath) {
    overrides.pgpmModulePath = options.pgpmModulePath;
  }

  if (options.pgpmWorkspacePath) {
    overrides.pgpmWorkspacePath = options.pgpmWorkspacePath;
  }

  if (options.pgpmModuleName) {
    overrides.pgpmModuleName = options.pgpmModuleName;
  }

  if (options.schemas) {
    overrides.schemas = options.schemas;
  }

  if (options.apiNames) {
    overrides.apiNames = options.apiNames;
  }

  if (options.keepDb !== undefined) {
    overrides.keepDb = options.keepDb;
  }

  if (options.output) {
    overrides.output = options.output;
  }

  return overrides;
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
  // Check for pgpm workspace mode (requires both pgpmWorkspacePath and pgpmModuleName)
  const hasPgpmWorkspace = options.pgpmWorkspacePath && options.pgpmModuleName;

  // Validate that at most one source is specified
  const sources = [
    options.endpoint,
    options.schema,
    options.database,
    options.pgpmModulePath,
    hasPgpmWorkspace,
  ].filter(Boolean);
  if (sources.length > 1) {
    return {
      success: false,
      error:
        'Multiple sources specified. Use only one of: endpoint, schema, database, pgpmModulePath, or pgpmWorkspacePath + pgpmModuleName.',
    };
  }

  // Find config file
  let configPath = options.config;
  if (!configPath) {
    configPath = findConfigFile() ?? undefined;
  }

  let baseConfig: GraphQLSDKConfig = {};

  if (configPath) {
    const loadResult = await loadConfigFile(configPath);
    if (!loadResult.success) {
      return { success: false, error: loadResult.error };
    }
    baseConfig = loadResult.config;
  }

  const overrides = buildTargetOverrides(options);

  if (isMultiConfig(baseConfig)) {
    return resolveMultiTargetConfig(baseConfig, options, overrides);
  }

  return resolveSingleTargetConfig(baseConfig as GraphQLSDKConfigTarget, options, overrides);
}

/**
 * Resolve a multi-target configuration
 */
function resolveMultiTargetConfig(
  baseConfig: GraphQLSDKMultiConfig,
  options: ConfigOverrideOptions,
  overrides: GraphQLSDKConfigTarget
): LoadConfigResult {
  if (Object.keys(baseConfig.targets).length === 0) {
    return {
      success: false,
      error: 'Config file defines no targets.',
    };
  }

  if (
    !options.target &&
    (options.endpoint || options.schema || options.database || 
     options.pgpmModulePath || options.pgpmWorkspacePath || options.output)
  ) {
    return {
      success: false,
      error:
        'Multiple targets configured. Use --target with source or output overrides.',
    };
  }

  if (options.target && !baseConfig.targets[options.target]) {
    return {
      success: false,
      error: `Target "${options.target}" not found in config file.`,
    };
  }

  const selectedTargets = options.target
    ? { [options.target]: baseConfig.targets[options.target] }
    : baseConfig.targets;
  const defaults = baseConfig.defaults ?? {};
  const resolvedTargets: ResolvedTargetConfig[] = [];

  for (const [name, target] of Object.entries(selectedTargets)) {
    let mergedTarget = mergeConfig(defaults, target);
    if (options.target && name === options.target) {
      mergedTarget = mergeConfig(mergedTarget, overrides);
    }

    const hasSource =
      mergedTarget.endpoint ||
      mergedTarget.schema ||
      mergedTarget.database ||
      mergedTarget.pgpmModulePath ||
      (mergedTarget.pgpmWorkspacePath && mergedTarget.pgpmModuleName);

    if (!hasSource) {
      return {
        success: false,
        error: `Target "${name}" is missing a source (endpoint, schema, database, or pgpm module).`,
      };
    }

    resolvedTargets.push({
      name,
      config: resolveConfig(mergedTarget),
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
  options: ConfigOverrideOptions,
  overrides: GraphQLSDKConfigTarget
): LoadConfigResult {
  if (options.target) {
    return {
      success: false,
      error:
        'Config file does not define targets. Remove --target to continue.',
    };
  }

  const mergedConfig = mergeConfig(baseConfig, overrides);

  // Check if we have a source (endpoint, schema, database, or pgpm module)
  const hasSource =
    mergedConfig.endpoint ||
    mergedConfig.schema ||
    mergedConfig.database ||
    mergedConfig.pgpmModulePath ||
    (mergedConfig.pgpmWorkspacePath && mergedConfig.pgpmModuleName);

  if (!hasSource) {
    return {
      success: false,
      error:
        'No source specified. Use --endpoint, --schema, --database, --pgpmModulePath, or --pgpmWorkspacePath + --pgpmModuleName, or create a config file with "graphql-codegen init".',
    };
  }

  // All source options are now first-class citizens in the config types,
  // so resolveConfig handles them properly without any casts
  const resolvedConfig = resolveConfig(mergedConfig);

  return {
    success: true,
    targets: [{ name: 'default', config: resolvedConfig }],
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
}): Promise<ResolvedConfig | null> {
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
    sourceOverrides.schema = undefined;
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

  if (mergedTarget.schema) {
    console.error(
      'x Watch mode is only supported with an endpoint, not schema.'
    );
    return null;
  }

  return resolveConfig(mergedTarget);
}
