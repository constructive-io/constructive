---
name: hooks-remote
description: React Query hooks for the remote API — provides typed query and mutation hooks for 3 tables and 1 custom operations
---

# hooks-remote

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for the remote API — provides typed query and mutation hooks for 3 tables and 1 custom operations

## Usage

```typescript
// Import hooks
import { useMachinesQuery } from './hooks';

// Query hooks: use<Model>Query, use<Model>sQuery
// Mutation hooks: useCreate<Model>Mutation, useUpdate<Model>Mutation, useDelete<Model>Mutation
// Bulk mutation hooks (when enabled): useBulkCreate<Model>Mutation, useBulkUpsert<Model>Mutation, etc.

const { data, isLoading } = useMachinesQuery({
  selection: { fields: { id: true } },
});
```

## Examples

### Query records

```typescript
const { data, isLoading } = useMachinesQuery({
  selection: { fields: { id: true } },
});
```

## References

See the `references/` directory for detailed per-entity API documentation:

- [machine](references/machine.md)
- [machine-message](references/machine-message.md)
- [machine-session](references/machine-session.md)
- [provision-bucket](references/provision-bucket.md)
