---
name: orm-infra
description: ORM client for the infra API — provides typed CRUD operations for 10 tables and 4 custom operations
---

# orm-infra

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM client for the infra API — provides typed CRUD operations for 10 tables and 4 custom operations

## Usage

```typescript
// Import the ORM client
import { db } from './orm';

// Available models: dbPreset, namespace, namespaceEvent, platformInfraCommit, platformInfraGetAllTreeNodesRecord, platformInfraObject, platformInfraRef, platformInfraStore, ...
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
- [namespace](references/namespace.md)
- [namespace-event](references/namespace-event.md)
- [platform-infra-commit](references/platform-infra-commit.md)
- [platform-infra-get-all-tree-nodes-record](references/platform-infra-get-all-tree-nodes-record.md)
- [platform-infra-object](references/platform-infra-object.md)
- [platform-infra-ref](references/platform-infra-ref.md)
- [platform-infra-store](references/platform-infra-store.md)
- [platform-namespace](references/platform-namespace.md)
- [platform-namespace-event](references/platform-namespace-event.md)
- [platform-infra-init-empty-repo](references/platform-infra-init-empty-repo.md)
- [platform-infra-insert-node-at-path](references/platform-infra-insert-node-at-path.md)
- [platform-infra-set-data-at-path](references/platform-infra-set-data-at-path.md)
- [provision-bucket](references/provision-bucket.md)
