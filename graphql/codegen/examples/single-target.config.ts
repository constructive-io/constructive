import { defineConfig } from '../src/types/config';

/**
 * Single-target config (backward compatible format)
 * Tests that the old config format without "targets" key still works.
 */
export default defineConfig({
  endpoint: 'http://api.localhost:3000/graphql',
  output: './examples/output/generated-sdk',
  orm: {
    output: './examples/output/generated-orm',
  },
});
