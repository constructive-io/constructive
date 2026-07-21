---
name: hooks-objects
description: React Query hooks for the objects API — provides typed query and mutation hooks for 5 tables and 4 custom operations
---

# hooks-objects

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for the objects API — provides typed query and mutation hooks for 5 tables and 4 custom operations

## Usage

```typescript
// Import hooks
import { useCommitsQuery } from './hooks';

// Query hooks: use<Model>Query, use<Model>sQuery
// Mutation hooks: useCreate<Model>Mutation, useUpdate<Model>Mutation, useDelete<Model>Mutation
// Bulk mutation hooks (when enabled): useBulkCreate<Model>Mutation, useBulkUpsert<Model>Mutation, etc.

const { data, isLoading } = useCommitsQuery({
  selection: { fields: { id: true } },
});
```

## Examples

### Query records

```typescript
const { data, isLoading } = useCommitsQuery({
  selection: { fields: { id: true } },
});
```

## References

See the `references/` directory for detailed per-entity API documentation:

- [commit](references/commit.md)
- [get-all-tree-nodes-record](references/get-all-tree-nodes-record.md)
- [object](references/object.md)
- [ref](references/ref.md)
- [store](references/store.md)
- [init-empty-repo](references/init-empty-repo.md)
- [insert-node-at-path](references/insert-node-at-path.md)
- [provision-bucket](references/provision-bucket.md)
- [set-data-at-path](references/set-data-at-path.md)
