import { getEnvOptions, getNodeEnv } from '@constructive-io/graphql-env';
import type { ConstructiveOptions } from '@constructive-io/graphql-types';

export type NodeEnv = 'development' | 'production' | 'test';

export type GraphqlRuntimeConfigOptions = {
  graphqlConfig?: ConstructiveOptions;
  envConfig?: NodeJS.ProcessEnv;
  cwd?: string;
};

export const resolveNodeEnvConfig = (
  envConfig?: NodeJS.ProcessEnv
): NodeEnv => {
  const raw = envConfig?.NODE_ENV?.toLowerCase();
  if (raw === 'production' || raw === 'test') return raw;
  if (raw === 'development') return 'development';
  return getNodeEnv() as NodeEnv;
};

export const resolveGraphqlConfig = (
  options: GraphqlRuntimeConfigOptions = {}
): ConstructiveOptions => {
  const env = options.envConfig ?? process.env;
  const cwd = options.cwd ?? process.cwd();
  return getEnvOptions(options.graphqlConfig ?? {}, cwd, env);
};

export const normalizeGraphqlConfigInput = (
  raw: ConstructiveOptions | GraphqlRuntimeConfigOptions = {}
): GraphqlRuntimeConfigOptions => {
  if (!raw || typeof raw !== 'object') {
    return {};
  }
  if ('graphqlConfig' in raw || 'envConfig' in raw || 'cwd' in raw) {
    return raw as GraphqlRuntimeConfigOptions;
  }
  return { graphqlConfig: raw as ConstructiveOptions };
};
