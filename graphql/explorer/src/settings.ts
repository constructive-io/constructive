import { ConstructiveOptions } from '@constructive-io/graphql-types';
import { getEnvOptions } from '@constructive-io/graphql-env';
import { getGraphileSettings as getSettings } from 'graphile-settings';
import { PostGraphileOptions } from 'postgraphile';

export const getGraphileSettings = (rawOpts: ConstructiveOptions): PostGraphileOptions => {
  const opts = getEnvOptions(rawOpts);

  const baseOptions = getSettings(opts);

  baseOptions.pgSettings = async function pgSettings(_req: any) {
    return { role: opts.pg?.user ?? 'postgres' };
  };

  return baseOptions;
};
