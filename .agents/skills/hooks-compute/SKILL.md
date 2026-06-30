---
name: hooks-compute
description: React Query hooks for the compute API — provides typed query and mutation hooks for 18 tables and 15 custom operations
---

# hooks-compute

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for the compute API — provides typed query and mutation hooks for 18 tables and 15 custom operations

## Usage

```typescript
// Import hooks
import { useGetAllQuery } from './hooks';

// Query hooks: use<Model>Query, use<Model>sQuery
// Mutation hooks: useCreate<Model>Mutation, useUpdate<Model>Mutation, useDelete<Model>Mutation
// Bulk mutation hooks (when enabled): useBulkCreate<Model>Mutation, useBulkUpsert<Model>Mutation, etc.

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
- [function-api-binding](references/function-api-binding.md)
- [function-deployment](references/function-deployment.md)
- [function-graph-ref](references/function-graph-ref.md)
- [function-graph-store](references/function-graph-store.md)
- [function-graph-object](references/function-graph-object.md)
- [function-deployment-event](references/function-deployment-event.md)
- [org-function-execution-log](references/org-function-execution-log.md)
- [function-graph-execution-output](references/function-graph-execution-output.md)
- [function-graph-commit](references/function-graph-commit.md)
- [secret-definition](references/secret-definition.md)
- [function-execution-log](references/function-execution-log.md)
- [function-graph-execution-node-state](references/function-graph-execution-node-state.md)
- [function-graph](references/function-graph.md)
- [org-function-invocation](references/org-function-invocation.md)
- [function-invocation](references/function-invocation.md)
- [function-graph-execution](references/function-graph-execution.md)
- [function-definition](references/function-definition.md)
- [read-function-graph](references/read-function-graph.md)
- [validate-function-graph](references/validate-function-graph.md)
- [init-empty-repo](references/init-empty-repo.md)
- [set-data-at-path](references/set-data-at-path.md)
- [import-definitions](references/import-definitions.md)
- [copy-graph](references/copy-graph.md)
- [save-graph](references/save-graph.md)
- [add-edge-and-save](references/add-edge-and-save.md)
- [add-node-and-save](references/add-node-and-save.md)
- [add-edge](references/add-edge.md)
- [add-node](references/add-node.md)
- [import-graph-json](references/import-graph-json.md)
- [insert-node-at-path](references/insert-node-at-path.md)
- [start-execution](references/start-execution.md)
- [provision-bucket](references/provision-bucket.md)
