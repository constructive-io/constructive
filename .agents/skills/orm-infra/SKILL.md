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

// Available models: dbPreset, infraCommit, infraGetAllRecord, infraObject, infraRef, infraStore, namespace, namespaceEvent, ...
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
