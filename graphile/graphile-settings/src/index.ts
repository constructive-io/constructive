/**
 * graphile-settings
 *
 * Shared PostGraphile v5 settings, presets, and plugins for Constructive.
 *
 * This package provides:
 * - Custom plugins for PostGraphile v5
 * - Pre-configured presets combining multiple plugins
 *
 * USAGE:
 *
 * 1. Use the main preset:
 * ```typescript
 * import { ConstructivePreset, makePgService } from 'graphile-settings';
 * import { makeSchema } from 'graphile-build';
 *
 * const preset = {
 *   extends: [ConstructivePreset],
 *   pgServices: [makePgService({ connectionString, schemas })],
 * };
 * const { schema } = await makeSchema(preset);
 * ```
 *
 * 2. Use individual plugins:
 * ```typescript
 * import { MinimalPreset, InflektPreset } from 'graphile-settings/plugins';
 * ```
 */

// Import modules for type augmentation
// These add properties to the GraphileConfig.Preset interface:
// - grafserv: adds 'grafserv' property
// - graphile-build: adds 'schema' property (typed as GraphileBuild.SchemaOptions)
// - postgraphile-plugin-connection-filter: augments SchemaOptions with connectionFilter* options
import 'postgraphile/grafserv';
import 'graphile-build';

import { makePgService as makePostGraphilePgService } from 'postgraphile/adaptors/pg';

import { assertIntrospectionClientReleaseCapabilities } from './introspection-client-release';
import {
  normalizeIntrospectionDependencySchemas,
  resolveIntrospectionSettings,
} from './introspection-settings';

export * from './introspection-client-release';

// ============================================================================
// Re-export all plugins and presets
// ============================================================================

// Main preset + factory
export type { ConstructivePresetOptions } from './presets/constructive-preset';
export {
  ConstructivePreset,
  createConstructivePreset,
} from './presets/constructive-preset';

// Re-export all plugins for convenience
export * from './plugins/index';

// Re-export presets
export * from './presets/index';

// ============================================================================
// Utilities
// ============================================================================

export type ConstructivePgServiceOptions = Parameters<
  typeof makePostGraphilePgService
>[0] & {
  introspectionMode?: 'stock' | 'scoped-required';
  introspectionScopedCatalogTypes?: 'all' | 'dependency-closure';
  introspectionAllowedDependencySchemas?: readonly string[];
  introspectionCapabilityExtensions?: readonly string[];
  introspectionClientReleaseMode?: 'reuse' | 'destroy';
};

const normalizeIntrospectionCapabilityExtensions = (
  extensions: readonly string[] | undefined
): readonly string[] => {
  if (extensions === undefined) return [];
  if (!Array.isArray(extensions)) {
    throw new Error('introspectionCapabilityExtensions must be an array');
  }
  return [
    ...new Set(
      extensions.map((extension) => {
        if (
          typeof extension !== 'string' ||
          extension.length === 0 ||
          extension.trim() !== extension ||
          extension.includes('\0')
        ) {
          throw new Error(
            'introspectionCapabilityExtensions must contain exact non-empty extension names'
          );
        }
        return extension;
      })
    ),
  ];
};

/**
 * Constructive's pgService factory adds the explicit catalog-introspection mode
 * consumed by Graphile's gather phase.
 */
export const makePgService = (options: ConstructivePgServiceOptions) => {
  const introspectionMode = options.introspectionMode ?? 'stock';
  const introspectionScopedCatalogTypes =
    options.introspectionScopedCatalogTypes;
  const introspectionCapabilityExtensions =
    normalizeIntrospectionCapabilityExtensions(
      options.introspectionCapabilityExtensions
    );
  const introspectionClientReleaseMode =
    options.introspectionClientReleaseMode ?? 'reuse';
  if (
    introspectionScopedCatalogTypes !== undefined &&
    introspectionScopedCatalogTypes !== 'all' &&
    introspectionScopedCatalogTypes !== 'dependency-closure'
  ) {
    throw new Error(
      `Unsupported scoped catalog type policy '${introspectionScopedCatalogTypes}'`
    );
  }
  if (
    introspectionMode === 'stock' &&
    introspectionScopedCatalogTypes !== undefined
  ) {
    throw new Error(
      'introspectionScopedCatalogTypes requires scoped-required introspection'
    );
  }
  if (
    introspectionMode === 'stock' &&
    options.introspectionCapabilityExtensions !== undefined
  ) {
    throw new Error(
      'introspectionCapabilityExtensions requires scoped-required introspection'
    );
  }
  if (
    introspectionClientReleaseMode !== 'reuse' &&
    introspectionClientReleaseMode !== 'destroy'
  ) {
    throw new Error(
      `Unsupported introspection client release mode '${introspectionClientReleaseMode}'`
    );
  }
  assertIntrospectionClientReleaseCapabilities(introspectionClientReleaseMode);
  const introspectionAllowedDependencySchemas =
    normalizeIntrospectionDependencySchemas(
      options.introspectionAllowedDependencySchemas
    );
  const pgSettingsForIntrospection = resolveIntrospectionSettings(
    introspectionMode,
    options.pgSettingsForIntrospection
  );
  const service = makePostGraphilePgService({
    ...options,
    pgSettingsForIntrospection,
  });
  return Object.assign(service, {
    introspectionMode,
    ...(introspectionScopedCatalogTypes === undefined
      ? {}
      : { introspectionScopedCatalogTypes }),
    introspectionAllowedDependencySchemas,
    ...(introspectionMode === 'scoped-required'
      ? { introspectionCapabilityExtensions }
      : {}),
    introspectionClientReleaseMode,
  });
};

export {
  normalizeIntrospectionDependencySchemas,
  resolveIntrospectionSettings,
} from './introspection-settings';

// Presigned URL utilities
export { getPresignedUrlS3Config } from './presigned-url-resolver';

// Bucket provisioner utilities
export { getBucketProvisionerConnection } from './bucket-provisioner-resolver';
