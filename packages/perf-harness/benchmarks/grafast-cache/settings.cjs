const { GraphQLSchema } = require('graphql');
const assert = require('node:assert/strict');

// Benchmark input only: use Grafast's public schema-extension settings directly.
// CNC configuration parsing and preset wiring are tested by their owning packages.
function applyCacheLimits(schema, limits) {
  if (limits === undefined) return schema;
  const config = schema.toConfig();
  return new GraphQLSchema({
    ...config,
    extensions: {
      ...config.extensions,
      grafast: { ...config.extensions?.grafast, ...limits },
    },
  });
}

function assertIndependent() {
  const forbidden = Object.keys(require.cache).filter(path =>
    /[/\\](?:graphile-settings|ts-node)(?:[/\\@])/.test(path));
  assert.deepEqual(forbidden, [], 'cache benchmark loaded application configuration or TypeScript tooling');
}

module.exports = { applyCacheLimits, assertIndependent };
