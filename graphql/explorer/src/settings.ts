import { ConstructiveOptions } from '@constructive-io/graphql-types';
import { getEnvOptions } from '@constructive-io/graphql-env';
import { ConstructivePreset } from 'graphile-settings';
import type { GraphileConfig } from 'graphile-config';

/**
 * Get a GraphileConfig.Preset for the explorer with grafast context configured.
 *
 * This returns a v5 preset that can be extended with pgServices.
 */
export const getGraphilePreset = (rawOpts: ConstructiveOptions): GraphileConfig.Preset => {
  const opts = getEnvOptions(rawOpts);

  return {
    extends: [ConstructivePreset],
    grafast: {
      context: () => ({
        pgSettings: { role: opts.pg?.user ?? 'postgres' },
      }),
    },
  };
};
