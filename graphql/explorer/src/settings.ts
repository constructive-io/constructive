import { getEnvOptions } from '@constructive-io/graphql-env';
import { ConstructiveOptions } from '@constructive-io/graphql-types';
import type { GraphileConfig } from 'graphile-config';
import { ConstructivePreset } from 'graphile-settings';

/**
 * Get a GraphileConfig.Preset for the explorer with grafast context configured.
 *
 * This returns a v5 preset that can be extended with pgServices.
 */
export const getGraphilePreset = (
  rawOpts: ConstructiveOptions,
  effectiveRole?: string
): GraphileConfig.Preset => {
  const role = effectiveRole ?? getEnvOptions(rawOpts).pg?.user ?? 'postgres';

  return {
    extends: [ConstructivePreset],
    grafast: {
      context: () => ({
        pgSettings: { role },
      }),
    },
  };
};
