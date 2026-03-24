---
name: hooks-objects
description: React Query hooks for the objects API — provides typed query and mutation hooks for 5 tables and 12 custom operations
---

# hooks-objects

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for the objects API — provides typed query and mutation hooks for 5 tables and 12 custom operations

## Usage

```typescript
// Import hooks
import { useGetAllQuery } from './hooks';

// Query hooks: use<Model>Query, use<Model>sQuery
// Mutation hooks: useCreate<Model>Mutation, useUpdate<Model>Mutation, useDelete<Model>Mutation

const { data, isLoading } = useGetAllQuery({
  selection: { fields: { id: true } },
});
```

## Examples

### Query records

```typescript
const { data, isLoading } = useGetAllQuery({
  selection: { fields: { id: true } },
});
```

## References

See the `references/` directory for detailed per-entity API documentation:

- [get-all-record](references/get-all-record.md)
- [object](references/object.md)
- [ref](references/ref.md)
- [store](references/store.md)
- [commit](references/commit.md)
- [rev-parse](references/rev-parse.md)
- [get-all-objects-from-root](references/get-all-objects-from-root.md)
- [get-path-objects-from-root](references/get-path-objects-from-root.md)
- [get-object-at-path](references/get-object-at-path.md)
- [freeze-objects](references/freeze-objects.md)
- [init-empty-repo](references/init-empty-repo.md)
- [remove-node-at-path](references/remove-node-at-path.md)
- [set-data-at-path](references/set-data-at-path.md)
- [set-props-and-commit](references/set-props-and-commit.md)
- [insert-node-at-path](references/insert-node-at-path.md)
- [update-node-at-path](references/update-node-at-path.md)
- [set-and-commit](references/set-and-commit.md)
