# graphile-function-bindings

PostGraphile v5 plugin that exposes API-bound compute functions as typed
GraphQL mutations.

At schema build (gather phase), the plugin queries `function_api_bindings`
joined to `function_definitions` for the configured `apiId` and emits one
mutation per graphql-enabled binding:

```graphql
<alias>(input: <Alias>Input!): <Alias>Payload
```

The payload returns the created invocation (`invocationId`, `status`, and the
full `FunctionInvocation` when the table is exposed in the schema).

## Binding config

One binding serves both REST and GraphQL. Per-protocol behavior lives in the
binding's `config` jsonb:

```json
{
  "graphql": true,
  "rest": { "path": "/resize", "methods": ["POST"] }
}
```

- Absent `graphql` key ⇒ the mutation is enabled.
- `"graphql": false` ⇒ the binding is not exposed as a GraphQL mutation.

## Input type derivation

Derivation lives in `src/derive.ts` (protocol-agnostic — intended to be the
shared source for future REST payload validation). Priority:

1. A JSON Schema on the binding config (`config.schema` /
   `config.payloadSchema`): object properties become input fields
   (string/number/boolean/enum/array/required mapped to GraphQL equivalents).
2. The definition's `payload_args` (`[{ "name": ..., "type": ... }]`): each
   declared arg becomes a nullable scalar field.
3. Fallback: a single `payload: JSON` field passed through verbatim.

No runtime payload validation is performed — derivation shapes the input
types only.

## Resolver

Invoking a function is a plain, RLS-enforced `INSERT INTO
function_invocations` executed on the normal authenticated connection
(`withPgClient` + `pgSettings` from the Grafast context). The server layer is
responsible for pgSettings (including the `jwt.claims.api_id` provenance
claim) — the plugin never sets claims, never uses a privileged connection,
and never bypasses RLS.

## Usage

```ts
import { createFunctionBindingsPlugin } from 'graphile-function-bindings';

const preset = {
  // ...
  plugins: [createFunctionBindingsPlugin({ apiId })],
};
```

The GraphQL server (`graphql/server`) wires this automatically per API using
the resolved `api.apiId`.

## Schema invalidation

Bindings are loaded once per schema build. New or changed bindings appear
after the next schema rebuild — i.e. when the server's cached PostGraphile
handler for the API is invalidated (graphile-cache LISTEN/NOTIFY) or the
server restarts. TODO: emit a cache invalidation NOTIFY when
`function_api_bindings` rows change so rebuilds happen automatically.
