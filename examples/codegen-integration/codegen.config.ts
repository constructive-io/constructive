import { defineConfig } from "@constructive-io/graphql-codegen";

export default defineConfig({
  endpoint: "http://example.local/graphql", // not used for fixture run
  output: "src/generated",
  reactQuery: true,
  orm: true,
  codegen: {
    maxFieldDepth: 2,
    skipQueryField: true
  },
  // Use the example schema fixtures baked into the repo
  schemaFile: "../../graphql/codegen/examples/example.schema.graphql"
});
