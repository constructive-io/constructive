# graphile-connection-filter

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
