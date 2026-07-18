---
name: orm-compute
description: ORM client for the compute API — provides typed CRUD operations for 65 tables and 29 custom operations
---

# orm-compute

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM client for the compute API — provides typed CRUD operations for 65 tables and 29 custom operations

## Usage

```typescript
// Import the ORM client
import { db } from './orm';

// Available models: dbPreset, declaredCapacity, functionApiBinding, functionDefinition, functionDeployment, functionDeploymentEvent, functionExecutionLog, functionGraphCommit, ...
db.<model>.findMany({ select: { id: true } }).execute()
db.<model>.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.<model>.create({ data: { ... }, select: { id: true } }).execute()
db.<model>.update({ where: { id: '<UUID>' }, data: { ... }, select: { id: true } }).execute()
db.<model>.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### Query records

```typescript
const items = await db.dbPreset.findMany({
  select: { id: true }
}).execute();
```

## References

See the `references/` directory for detailed per-entity API documentation:

- [db-preset](references/db-preset.md)
- [declared-capacity](references/declared-capacity.md)
- [function-api-binding](references/function-api-binding.md)
- [function-definition](references/function-definition.md)
- [function-deployment](references/function-deployment.md)
- [function-deployment-event](references/function-deployment-event.md)
- [function-execution-log](references/function-execution-log.md)
- [function-graph-commit](references/function-graph-commit.md)
- [function-graph](references/function-graph.md)
- [function-graph-execution](references/function-graph-execution.md)
- [function-graph-execution-node-state](references/function-graph-execution-node-state.md)
- [function-graph-execution-output](references/function-graph-execution-output.md)
- [function-graph-object](references/function-graph-object.md)
- [function-graph-ref](references/function-graph-ref.md)
- [function-graph-store](references/function-graph-store.md)
- [function-invocation](references/function-invocation.md)
- [get-all-tree-nodes-record](references/get-all-tree-nodes-record.md)
- [infra-commit](references/infra-commit.md)
- [infra-get-all-tree-nodes-record](references/infra-get-all-tree-nodes-record.md)
- [infra-object](references/infra-object.md)
- [infra-ref](references/infra-ref.md)
- [infra-store](references/infra-store.md)
- [integration-provider](references/integration-provider.md)
- [namespace](references/namespace.md)
- [namespace-event](references/namespace-event.md)
- [platform-declared-capacity](references/platform-declared-capacity.md)
- [platform-function-api-binding](references/platform-function-api-binding.md)
- [platform-function-definition](references/platform-function-definition.md)
- [platform-function-deployment](references/platform-function-deployment.md)
- [platform-function-deployment-event](references/platform-function-deployment-event.md)
- [platform-function-execution-log](references/platform-function-execution-log.md)
- [platform-function-invocation](references/platform-function-invocation.md)
- [platform-infra-commit](references/platform-infra-commit.md)
- [platform-infra-get-all-tree-nodes-record](references/platform-infra-get-all-tree-nodes-record.md)
- [platform-infra-object](references/platform-infra-object.md)
- [platform-infra-ref](references/platform-infra-ref.md)
- [platform-infra-store](references/platform-infra-store.md)
- [platform-namespace](references/platform-namespace.md)
- [platform-namespace-event](references/platform-namespace-event.md)
- [platform-resource](references/platform-resource.md)
- [platform-resource-definition](references/platform-resource-definition.md)
- [platform-resource-event](references/platform-resource-event.md)
- [platform-resource-installation](references/platform-resource-installation.md)
- [platform-resource-status-check](references/platform-resource-status-check.md)
- [platform-resource-usage-log](references/platform-resource-usage-log.md)
- [platform-resource-usage-summary](references/platform-resource-usage-summary.md)
- [platform-resource-utilization-daily](references/platform-resource-utilization-daily.md)
- [platform-resources-health](references/platform-resources-health.md)
- [platform-resources-requirements-state](references/platform-resources-requirements-state.md)
- [platform-resources-resolved-requirement](references/platform-resources-resolved-requirement.md)
- [platform-webhook-endpoint](references/platform-webhook-endpoint.md)
- [platform-webhook-event](references/platform-webhook-event.md)
- [resource](references/resource.md)
- [resource-definition](references/resource-definition.md)
- [resource-event](references/resource-event.md)
- [resource-installation](references/resource-installation.md)
- [resource-status-check](references/resource-status-check.md)
- [resource-usage-log](references/resource-usage-log.md)
- [resource-usage-summary](references/resource-usage-summary.md)
- [resource-utilization-daily](references/resource-utilization-daily.md)
- [resources-health](references/resources-health.md)
- [resources-requirements-state](references/resources-requirements-state.md)
- [resources-resolved-requirement](references/resources-resolved-requirement.md)
- [webhook-endpoint](references/webhook-endpoint.md)
- [webhook-event](references/webhook-event.md)
- [read-function-graph](references/read-function-graph.md)
- [add-edge](references/add-edge.md)
- [add-edge-and-save](references/add-edge-and-save.md)
- [add-node](references/add-node.md)
- [add-node-and-save](references/add-node-and-save.md)
- [copy-graph](references/copy-graph.md)
- [import-definitions](references/import-definitions.md)
- [import-graph-json](references/import-graph-json.md)
- [infra-init-empty-repo](references/infra-init-empty-repo.md)
- [infra-insert-node-at-path](references/infra-insert-node-at-path.md)
- [infra-set-data-at-path](references/infra-set-data-at-path.md)
- [init-empty-repo](references/init-empty-repo.md)
- [insert-node-at-path](references/insert-node-at-path.md)
- [platform-infra-init-empty-repo](references/platform-infra-init-empty-repo.md)
- [platform-infra-insert-node-at-path](references/platform-infra-insert-node-at-path.md)
- [platform-infra-set-data-at-path](references/platform-infra-set-data-at-path.md)
- [platform-resource-installations-install](references/platform-resource-installations-install.md)
- [platform-resource-installations-rollback](references/platform-resource-installations-rollback.md)
- [platform-resource-installations-uninstall](references/platform-resource-installations-uninstall.md)
- [platform-resource-installations-upgrade](references/platform-resource-installations-upgrade.md)
- [provision-bucket](references/provision-bucket.md)
- [resource-installations-install](references/resource-installations-install.md)
- [resource-installations-rollback](references/resource-installations-rollback.md)
- [resource-installations-uninstall](references/resource-installations-uninstall.md)
- [resource-installations-upgrade](references/resource-installations-upgrade.md)
- [save-graph](references/save-graph.md)
- [set-data-at-path](references/set-data-at-path.md)
- [start-execution](references/start-execution.md)
- [validate-function-graph](references/validate-function-graph.md)
