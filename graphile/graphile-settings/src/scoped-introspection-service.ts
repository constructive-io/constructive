import type { ScopedIntrospectionServiceOptions } from '@constructive-io/graphql-types';

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

export type ScopedIntrospectionOptions = Omit<
  ScopedIntrospectionServiceOptions,
  'introspectionMode'
>;

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
  options: TOptions & ScopedIntrospectionOptions
) {
  const {
    introspectionScopedCatalogTypes,
    introspectionAllowedDependencySchemas: configuredDependencySchemas,
    introspectionCapabilityExtensions: configuredCapabilityExtensions,
    ...upstreamOptions
  } = options;
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
  const introspectionAllowedDependencySchemas =
    normalizeIntrospectionDependencySchemas(configuredDependencySchemas);
  const pgSettingsForIntrospection = resolveIntrospectionSettings(
    'scoped-required',
    options.pgSettingsForIntrospection
  );
  const service = makeUpstreamPgService({
    ...upstreamOptions,
    pgSettingsForIntrospection,
  } as TOptions);

  return Object.assign(service, {
    introspectionMode: 'scoped-required' as const,
    introspectionScopedCatalogTypes:
      introspectionScopedCatalogTypes ?? 'dependency-closure',
    introspectionAllowedDependencySchemas,
    introspectionCapabilityExtensions,
  });
}
