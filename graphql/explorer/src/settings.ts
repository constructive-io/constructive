import { ConstructiveOptions } from '@constructive-io/graphql-types';
import { getEnvOptions } from '@constructive-io/graphql-env';
import { createConstructivePreset } from 'graphile-settings';
import type { GraphileConfig } from 'graphile-config';

/**
 * Get a GraphileConfig.Preset for the explorer with grafast context configured.
 *
 * This returns a v5 preset that can be extended with pgServices.
 */
export const getGraphilePreset = (
  rawOpts: ConstructiveOptions,
  runtime: { cwd?: string; env?: NodeJS.ProcessEnv } = {}
): GraphileConfig.Preset => {
  const opts = getEnvOptions(rawOpts, runtime.cwd, runtime.env);

  return {
    extends: [createConstructivePreset()],
    grafast: {
      context: () => ({
        pgSettings: { role: opts.pg?.user ?? 'postgres' },
      }),
    },
  };
};
