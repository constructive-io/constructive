import { defineConfig } from '../src/types/config';

/**
 * Single-target config
 */
export default defineConfig({
  endpoint: 'http://api.localhost:3000/graphql',
  output: './examples/output/generated-sdk',
  orm: {
    output: './examples/output/generated-orm',
  },
});
