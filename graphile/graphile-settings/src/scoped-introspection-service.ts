import type { ScopedIntrospectionServiceOptions } from '@constructive-io/graphql-types';

import { resolveIntrospectionSettings } from './introspection-settings';

type UpstreamPgServiceOptions = {
  pgSettingsForIntrospection?:
    Record<string, string | undefined> | null | undefined;
};

export type ScopedIntrospectionOptions = Omit<
  ScopedIntrospectionServiceOptions,
  'scopedIntrospection'
> & {
  introspectionJit?: boolean;
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
  options: TOptions & ScopedIntrospectionOptions
) {
  const {
    introspectionScopedCatalogTypes,
    introspectionAllowedDependencySchemas: configuredDependencySchemas,
    introspectionCapabilityExtensions: configuredCapabilityExtensions,
    introspectionJit = false,
    ...upstreamOptions
  } = options;
  const pgSettingsForIntrospection = resolveIntrospectionSettings(
    introspectionJit,
    options.pgSettingsForIntrospection
  );
  const service = makeUpstreamPgService({
    ...upstreamOptions,
    pgSettingsForIntrospection,
  } as TOptions);

  return Object.assign(service, {
    scopedIntrospection: true as const,
    introspectionScopedCatalogTypes:
      introspectionScopedCatalogTypes ?? 'dependency-closure',
    introspectionAllowedDependencySchemas: configuredDependencySchemas ?? [],
    introspectionCapabilityExtensions: configuredCapabilityExtensions ?? [],
  });
}
