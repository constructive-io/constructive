import { defineConfig } from '../src/types/config';

export default defineConfig({
  defaults: {
    endpoint: 'http://api.localhost:3000/graphql',
  },
  targets: {
    public: {
      output: './examples/output/generated-sdk-public',
      orm: { output: './examples/output/generated-orm-public' },
    },
    admin: {
      output: './examples/output/generated-sdk-admin',
      orm: { output: './examples/output/generated-orm-admin' },
    },
  },
});
