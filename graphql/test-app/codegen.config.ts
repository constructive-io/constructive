import { defineConfig } from '@constructive-io/graphql-codegen';

const config = defineConfig({
  endpoint: 'http://api.localhost:3000/graphql',
  output: 'src/generated',
  reactQuery: true,
});

export default config;
