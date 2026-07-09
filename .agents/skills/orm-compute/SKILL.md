---
name: orm-compute
description: ORM client for the compute API — provides typed CRUD operations for 22 tables and 15 custom operations
---

# orm-compute

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM client for the compute API — provides typed CRUD operations for 22 tables and 15 custom operations

## Usage

```typescript
// Import the ORM client
import { db } from './orm';

// Available models: getAllRecord, functionApiBinding, functionDeployment, resource, functionGraphRef, functionGraphStore, functionGraphObject, functionDeploymentEvent, ...
db.<model>.findMany({ select: { id: true } }).execute()
db.<model>.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.<model>.create({ data: { ... }, select: { id: true } }).execute()
db.<model>.update({ where: { id: '<UUID>' }, data: { ... }, select: { id: true } }).execute()
db.<model>.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### Query records

```typescript
const items = await db.getAllRecord.findMany({
  select: { id: true }
}).execute();
```

## References

See the `references/` directory for detailed per-entity API documentation:

- [get-all-record](references/get-all-record.md)
- [function-api-binding](references/function-api-binding.md)
- [function-deployment](references/function-deployment.md)
- [resource](references/resource.md)
- [function-graph-ref](references/function-graph-ref.md)
- [function-graph-store](references/function-graph-store.md)
- [function-graph-object](references/function-graph-object.md)
- [function-deployment-event](references/function-deployment-event.md)
- [org-function-execution-log](references/org-function-execution-log.md)
- [resource-event](references/resource-event.md)
- [function-graph-execution-output](references/function-graph-execution-output.md)
- [function-graph-commit](references/function-graph-commit.md)
- [secret-definition](references/secret-definition.md)
- [function-execution-log](references/function-execution-log.md)
- [function-graph](references/function-graph.md)
- [function-graph-execution-node-state](references/function-graph-execution-node-state.md)
- [platform-namespace](references/platform-namespace.md)
- [org-function-invocation](references/org-function-invocation.md)
- [function-invocation](references/function-invocation.md)
- [platform-namespace-event](references/platform-namespace-event.md)
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
- [import-graph-json](references/import-graph-json.md)
- [add-edge](references/add-edge.md)
- [add-node](references/add-node.md)
- [insert-node-at-path](references/insert-node-at-path.md)
- [start-execution](references/start-execution.md)
- [provision-bucket](references/provision-bucket.md)
