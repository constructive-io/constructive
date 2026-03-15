# graphile-connection-filter

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
   <a href="https://github.com/constructive-io/constructive/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
   <a href="https://www.npmjs.com/package/graphile-connection-filter"><img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/constructive?filename=graphile%2Fgraphile-connection-filter%2Fpackage.json"/></a>
</p>

A PostGraphile v5 native connection filter plugin for the Constructive monorepo.

Adds advanced filtering capabilities to connection and list fields, including:

- Per-table filter types (e.g. `UserFilter`)
- Per-scalar operator types (e.g. `StringFilter`, `IntFilter`)
- Standard operators: `equalTo`, `notEqualTo`, `isNull`, `in`, `notIn`, etc.
- Sort operators: `lessThan`, `greaterThan`, etc.
- Pattern matching: `includes`, `startsWith`, `endsWith`, `like` + case-insensitive variants
- Type-specific operators: JSONB, hstore, inet, array, range
- Logical operators: `and`, `or`, `not`
- Declarative custom operator API: `connectionFilterOperatorFactories` for satellite plugins

## Usage

```typescript
import { ConnectionFilterPreset } from 'graphile-connection-filter';

const preset: GraphileConfig.Preset = {
  extends: [
    ConnectionFilterPreset(),
  ],
};
```

## Custom Operators

Satellite plugins declare custom operators via `connectionFilterOperatorFactories` in their preset's schema options. Each factory is a function that receives the `build` object and returns an array of operator registrations:

```typescript
import type { ConnectionFilterOperatorFactory } from 'graphile-connection-filter';

const myOperatorFactory: ConnectionFilterOperatorFactory = (build) => [{
  typeNames: 'MyType',
  operatorName: 'myOperator',
  spec: {
    description: 'My custom operator',
    resolve: (sqlIdentifier, sqlValue) => build.sql`${sqlIdentifier} OP ${sqlValue}`,
  },
}];

const MyPreset: GraphileConfig.Preset = {
  schema: {
    connectionFilterOperatorFactories: [myOperatorFactory],
  },
};
```
