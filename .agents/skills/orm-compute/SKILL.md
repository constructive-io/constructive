---
name: orm-compute
description: ORM client for the compute API — provides typed CRUD operations for 44 tables and 18 custom operations
---

# orm-compute

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM client for the compute API — provides typed CRUD operations for 44 tables and 18 custom operations

## Usage

```typescript
// Import the ORM client
import { db } from './orm';

// Available models: infraGetAllRecord, getAllRecord, infraRef, infraStore, functionApiBinding, functionGraphRef, functionGraphStore, platformFunctionApiBinding, ...
db.<model>.findMany({ select: { id: true } }).execute()
db.<model>.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.<model>.create({ data: { ... }, select: { id: true } }).execute()
db.<model>.update({ where: { id: '<UUID>' }, data: { ... }, select: { id: true } }).execute()
db.<model>.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### Query records

```typescript
const items = await db.infraGetAllRecord.findMany({
  select: { id: true }
}).execute();
```

## References

See the `references/` directory for detailed per-entity API documentation:

- [infra-get-all-record](references/infra-get-all-record.md)
- [get-all-record](references/get-all-record.md)
- [infra-ref](references/infra-ref.md)
- [infra-store](references/infra-store.md)
- [function-api-binding](references/function-api-binding.md)
- [function-graph-ref](references/function-graph-ref.md)
- [function-graph-store](references/function-graph-store.md)
- [platform-function-api-binding](references/platform-function-api-binding.md)
- [platform-resources-requirements-state](references/platform-resources-requirements-state.md)
- [resources-requirements-state](references/resources-requirements-state.md)
- [platform-resource-status-check](references/platform-resource-status-check.md)
- [platform-function-deployment](references/platform-function-deployment.md)
- [platform-resource](references/platform-resource.md)
- [platform-resource-definition](references/platform-resource-definition.md)
- [infra-object](references/infra-object.md)
- [function-graph-object](references/function-graph-object.md)
- [platform-function-deployment-event](references/platform-function-deployment-event.md)
- [platform-resource-event](references/platform-resource-event.md)
- [resource-status-check](references/resource-status-check.md)
- [function-deployment](references/function-deployment.md)
- [resource](references/resource.md)
- [resource-definition](references/resource-definition.md)
- [function-deployment-event](references/function-deployment-event.md)
- [platform-function-execution-log](references/platform-function-execution-log.md)
- [resource-event](references/resource-event.md)
- [function-graph-execution-output](references/function-graph-execution-output.md)
- [infra-commit](references/infra-commit.md)
- [function-graph-commit](references/function-graph-commit.md)
- [function-execution-log](references/function-execution-log.md)
- [platform-resources-resolved-requirement](references/platform-resources-resolved-requirement.md)
- [resources-resolved-requirement](references/resources-resolved-requirement.md)
- [db-preset](references/db-preset.md)
- [platform-namespace](references/platform-namespace.md)
- [function-graph](references/function-graph.md)
- [function-graph-execution-node-state](references/function-graph-execution-node-state.md)
- [namespace](references/namespace.md)
- [platform-function-invocation](references/platform-function-invocation.md)
- [function-invocation](references/function-invocation.md)
- [platform-namespace-event](references/platform-namespace-event.md)
- [integration-provider](references/integration-provider.md)
- [namespace-event](references/namespace-event.md)
- [function-graph-execution](references/function-graph-execution.md)
- [platform-function-definition](references/platform-function-definition.md)
- [function-definition](references/function-definition.md)
- [read-function-graph](references/read-function-graph.md)
- [validate-function-graph](references/validate-function-graph.md)
- [infra-init-empty-repo](references/infra-init-empty-repo.md)
- [init-empty-repo](references/init-empty-repo.md)
- [import-definitions](references/import-definitions.md)
- [infra-set-data-at-path](references/infra-set-data-at-path.md)
- [set-data-at-path](references/set-data-at-path.md)
- [copy-graph](references/copy-graph.md)
- [save-graph](references/save-graph.md)
- [add-edge-and-save](references/add-edge-and-save.md)
- [add-node-and-save](references/add-node-and-save.md)
- [import-graph-json](references/import-graph-json.md)
- [add-edge](references/add-edge.md)
- [add-node](references/add-node.md)
- [infra-insert-node-at-path](references/infra-insert-node-at-path.md)
- [insert-node-at-path](references/insert-node-at-path.md)
- [start-execution](references/start-execution.md)
- [provision-bucket](references/provision-bucket.md)
