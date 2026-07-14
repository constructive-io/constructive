---
name: hooks-infra
description: React Query hooks for the infra API — provides typed query and mutation hooks for 10 tables and 4 custom operations
---

# hooks-infra

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for the infra API — provides typed query and mutation hooks for 10 tables and 4 custom operations

## Usage

```typescript
// Import hooks
import { useDbPresetsQuery } from './hooks';

// Query hooks: use<Model>Query, use<Model>sQuery
// Mutation hooks: useCreate<Model>Mutation, useUpdate<Model>Mutation, useDelete<Model>Mutation
// Bulk mutation hooks (when enabled): useBulkCreate<Model>Mutation, useBulkUpsert<Model>Mutation, etc.

const { data, isLoading } = useDbPresetsQuery({
  selection: { fields: { id: true } },
});
```

## Examples

### Query records

```typescript
const { data, isLoading } = useDbPresetsQuery({
  selection: { fields: { id: true } },
});
```

## References

See the `references/` directory for detailed per-entity API documentation:

- [db-preset](references/db-preset.md)
- [infra-commit](references/infra-commit.md)
- [infra-get-all-record](references/infra-get-all-record.md)
- [infra-object](references/infra-object.md)
- [infra-ref](references/infra-ref.md)
- [infra-store](references/infra-store.md)
- [namespace](references/namespace.md)
- [namespace-event](references/namespace-event.md)
- [platform-namespace](references/platform-namespace.md)
- [platform-namespace-event](references/platform-namespace-event.md)
- [infra-init-empty-repo](references/infra-init-empty-repo.md)
- [infra-insert-node-at-path](references/infra-insert-node-at-path.md)
- [infra-set-data-at-path](references/infra-set-data-at-path.md)
- [provision-bucket](references/provision-bucket.md)
