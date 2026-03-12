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
- Custom operator API: `addConnectionFilterOperator` for satellite plugins

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

Satellite plugins can register custom operators during the `init` hook:

```typescript
const addConnectionFilterOperator = (build as any).addConnectionFilterOperator;
if (typeof addConnectionFilterOperator === 'function') {
  addConnectionFilterOperator('MyType', 'myOperator', {
    description: 'My custom operator',
    resolve: (sqlIdentifier, sqlValue) => sql`${sqlIdentifier} OP ${sqlValue}`,
  });
}
```
