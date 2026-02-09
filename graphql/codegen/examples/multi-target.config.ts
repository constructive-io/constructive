import type { GraphQLSDKConfigTarget } from '../src/types/config';

/**
 * Multi-target example config for graphql-codegen
 *
 * Usage with CLI flags to select mode:
 *   tsx src/cli/index.ts --config examples/multi-target.config.ts --react-query
 *   tsx src/cli/index.ts --config examples/multi-target.config.ts --orm
 */
const config: GraphQLSDKConfigTarget = {
  endpoint: 'http://api.localhost:3000/graphql',
  output: './examples/output/generated-sdk-public',
};

export default config;
