import type { PgScopedIntrospectionServiceConfig } from '@constructive-io/graphql-types';
import { cleanEnv, enumerated, EnvError, makeValidator, parseEnvList, str } from '12factor-env';

// Unlike the generic list validator, this configuration permits an explicit
// empty list (clear the configured extensions), but rejects empty CSV items.
const capabilityExtensions = makeValidator<string[]>((value) => {
  if (value.trim() === '') return [];
  if (value.split(',').some((item) => item.trim() === '')) {
    throw new EnvError('Expected comma-separated extension names without empty items');
  }
  return [...new Set(parseEnvList(value))];
});

/** Partial override for the server-owned `main` service; absence is not a default. */
export const getScopedIntrospectionEnv = (
  environment: NodeJS.ProcessEnv
): PgScopedIntrospectionServiceConfig | undefined => {
  const enabled = cleanEnv({
    GRAPHILE_SCOPED_INTROSPECTION:
      environment.GRAPHILE_SCOPED_INTROSPECTION?.trim() || undefined
  }, {
    GRAPHILE_SCOPED_INTROSPECTION: str({
      choices: ['true', 'false'],
      default: undefined
    })
  }).GRAPHILE_SCOPED_INTROSPECTION;

  // The rollback switch works even if stale advanced settings are malformed.
  if (enabled === 'false') return false;

  const options = cleanEnv(environment, {
    GRAPHILE_SCOPED_INTROSPECTION_CATALOG_TYPES: enumerated(
      ['all', 'dependency-closure'] as const,
      { default: undefined }
    ),
    GRAPHILE_SCOPED_INTROSPECTION_CAPABILITY_EXTENSIONS: capabilityExtensions({
      default: undefined
    })
  });
  const catalogTypes = options.GRAPHILE_SCOPED_INTROSPECTION_CATALOG_TYPES;
  const extensions = options.GRAPHILE_SCOPED_INTROSPECTION_CAPABILITY_EXTENSIONS;
  if (enabled === undefined && catalogTypes === undefined && extensions === undefined) {
    return undefined;
  }

  // An object enables scoped introspection while deepmerge preserves advanced
  // fields from pgpm.json. A literal `true` would discard those fields.
  return {
    ...(catalogTypes !== undefined && { catalogTypes }),
    ...(extensions !== undefined && { capabilityExtensions: extensions })
  };
};
