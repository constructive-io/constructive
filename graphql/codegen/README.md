# @constructive-io/graphql-codegen

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
   <a href="https://github.com/constructive-io/constructive/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
   <a href="https://www.npmjs.com/package/@constructive-io/graphql-codegen"><img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/constructive?filename=graphql%2Fcodegen%2Fpackage.json"/></a>
</p>

Generate GraphQL mutations/queries

```sh
npm install @constructive-io/graphql-codegen
```

## introspecting via GraphQL

```js
import {
  generate
} from '@constructive-io/graphql-codegen';
import { print } from 'graphql/language';

const gen = generate(resultOfIntrospectionQuery);
const output = Object.keys(gen).reduce((m, key) => {
  m[key] = print(gen[key].ast);
  return m;
}, {});

console.log(output);
```

# output

which will output the entire API as an object with the mutations and queries as values

```json
{
  "createApiTokenMutation": "mutation createApiTokenMutation($id: UUID, $userId: UUID!, $accessToken: String, $accessTokenExpiresAt: Datetime) {
  createApiToken(input: {apiToken: {id: $id, userId: $userId, accessToken: $accessToken, accessTokenExpiresAt: $accessTokenExpiresAt}}) {
    apiToken {
      id
      userId
      accessToken
      accessTokenExpiresAt
    }
  }
}
```

## Codegen (types, operations, SDK, React Query)

Programmatic codegen generates files to disk from a schema SDL file or from a live endpoint via introspection.

```js
import { runCodegen, defaultGraphQLCodegenOptions } from '@constructive-io/graphql-codegen'

await runCodegen({
  input: { schema: './schema.graphql' }, // or: { endpoint: 'http://localhost:3000/graphql', headers: { Host: 'meta8.localhost' } }
  output: defaultGraphQLCodegenOptions.output, // root/typesFile/operationsDir/sdkFile/reactQueryFile
  documents: defaultGraphQLCodegenOptions.documents, // format: 'gql'|'ts', naming convention
  features: { emitTypes: true, emitOperations: true, emitSdk: true, emitReactQuery: true },
  reactQuery: { fetcher: 'graphql-request' }
}, process.cwd())
```

Outputs under `output.root`:
- `types/generated.ts` (schema types)
- `operations/*` (queries/mutations/Fragments)
- `sdk.ts` (typed GraphQL Request client)
- `react-query.ts` (typed React Query hooks; generated when `emitReactQuery: true`)

Documents options:
- `format`: `'gql' | 'ts'`
- `convention`: `'dashed' | 'underscore' | 'camelcase' | 'camelUpper'`
- `allowQueries`, `excludeQueries`, `excludePatterns` to control which root fields become operations

Endpoint introspection:
- Set `input.endpoint` and optional `input.headers`
- If your dev server routes by hostname, add `headers: { Host: 'meta8.localhost' }`

## Selection Options

Configure result field selections, mutation input style, and connection pagination shape.

```ts
selection: {
  defaultMutationModelFields?: string[]
  modelFields?: Record<string, string[]>
  mutationInputMode?: 'expanded' | 'model' | 'raw' | 'patchCollapsed'
  connectionStyle?: 'nodes' | 'edges'
  forceModelOutput?: boolean
}
```

- `defaultMutationModelFields`
  - Sets default fields selected from the object payload returned by mutations when the mutation exposes an OBJECT output.
  - Example: `['id']` will select only the `id` from the returned model unless overridden per model.

- `modelFields`
  - Per‑model overrides for returned object payload fields.
  - Example: `{ domain: ['id','domain','subdomain'] }` selects those fields from the `domain` object output.

- `mutationInputMode`
  - Controls how mutation variables and `input` are generated.
  - `expanded`: one variable per input property; `input` is a flat object of those variables.
  - `model`: one variable per property; variables are nested under the singular model key inside `input`.
  - `raw`: a single `$input: <CreateXInput>!` variable passed directly as `input: $input`.
  - `patchCollapsed`: a single `$patch: <ModelPatch>!` plus required locator(s) (e.g., `$id`), passed as `input: { id: $id, patch: $patch }`.

- `connectionStyle`
  - Standardizes connection queries and nested many selections.
  - `nodes`: emits `totalCount` and `nodes { ... }`.
  - `edges`: emits `totalCount`, `pageInfo { ... }`, and `edges { cursor node { ... } }`.

- `forceModelOutput`
  - When `true`, ensures the object payload is selected even if `defaultMutationModelFields` is empty, defaulting to `['id']`.
  - Useful to avoid generating mutations that only return `clientMutationId`.

### Examples

Create mutation with raw input:

```graphql
mutation createDomain($input: CreateDomainInput!) {
  createDomain(input: $input) {
    domain { id, domain, subdomain }
  }
}
```

Patch mutation with collapsed patch:

```graphql
mutation updateDomain($id: UUID!, $patch: DomainPatch!) {
  updateDomain(input: { id: $id, patch: $patch }) {
    domain { id }
    clientMutationId
  }
}
```

Edges‑style connection query:

```graphql
query getDomainsPaginated($first: Int, $after: Cursor) {
  domains(first: $first, after: $after) {
    totalCount
    pageInfo { hasNextPage hasPreviousPage endCursor startCursor }
    edges { cursor node { id domain subdomain } }
  }
}
```

## Custom Scalars and Type Overrides

- When your schema exposes custom scalars that are not available in the printed SDL or differ across environments, you can configure both TypeScript scalar typings and GraphQL type names used in generated operations.

- Add these to your config object:

```json
{
  "scalars": {
    "LaunchqlInternalTypeHostname": "string",
    "PgpmInternalTypeHostname": "string"
  },
  "typeNameOverrides": {
    "LaunchqlInternalTypeHostname": "String",
    "PgpmInternalTypeHostname": "String"
  }
}
```

- `scalars`: maps GraphQL scalar names to TypeScript types for `typescript`/`typescript-operations`/`typescript-graphql-request`/`typescript-react-query` plugins.
- `typeNameOverrides`: rewrites scalar names in generated GraphQL AST so variable definitions and input fields use compatible built‑in GraphQL types.

- These options are also available programmatically through `LaunchQLGenOptions`.
