import { defineConfig } from '@constructive-io/graphql-codegen';

const config = defineConfig({
  endpoint: 'https://api.launchql.dev/graphql',
  output: 'src/generated',
  reactQuery: true,
});

export default config;
