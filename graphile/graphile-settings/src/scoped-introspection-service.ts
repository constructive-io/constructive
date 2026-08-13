import type {
  GraphileIntrospectionMode,
  ScopedIntrospectionServiceOptions,
} from 'graphile-scoped-introspection';

import {
  normalizeIntrospectionDependencySchemas,
  resolveIntrospectionSettings,
} from './introspection-settings';

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

type UpstreamPgServiceOptions = {
  pgSettingsForIntrospection?:
    Record<string, string | undefined> | null | undefined;
};

/**
 * Apply CNC's scoped-introspection settings around an upstream PgService
 * factory. The injected binding keeps configuration behavior independently
 * testable without duplicating or mocking the Graphile adaptor.
 */
export function makeConfiguredPgService<
  TOptions extends UpstreamPgServiceOptions,
  TService extends object,
>(
  makeUpstreamPgService: (options: TOptions) => TService,
  options: TOptions & ScopedIntrospectionServiceOptions
) {
  const {
    introspectionMode: configuredIntrospectionMode,
    introspectionScopedCatalogTypes,
    introspectionAllowedDependencySchemas: configuredDependencySchemas,
    introspectionCapabilityExtensions: configuredCapabilityExtensions,
    ...upstreamOptions
  } = options;
  const introspectionMode: GraphileIntrospectionMode =
    configuredIntrospectionMode ?? 'stock';
  const introspectionCapabilityExtensions =
    normalizeIntrospectionCapabilityExtensions(configuredCapabilityExtensions);

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
    configuredCapabilityExtensions !== undefined
  ) {
    throw new Error(
      'introspectionCapabilityExtensions requires scoped-required introspection'
    );
  }

  const introspectionAllowedDependencySchemas =
    normalizeIntrospectionDependencySchemas(configuredDependencySchemas);
  const pgSettingsForIntrospection = resolveIntrospectionSettings(
    introspectionMode,
    options.pgSettingsForIntrospection
  );
  const service = makeUpstreamPgService({
    ...upstreamOptions,
    pgSettingsForIntrospection,
  } as TOptions);

  return Object.assign(service, {
    introspectionMode,
    ...(introspectionScopedCatalogTypes === undefined
      ? {}
      : { introspectionScopedCatalogTypes }),
    introspectionAllowedDependencySchemas,
    ...(introspectionMode === 'scoped-required'
      ? { introspectionCapabilityExtensions }
      : {}),
  });
}
