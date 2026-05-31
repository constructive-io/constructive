---
name: orm-objects
description: ORM client for the objects API — provides typed CRUD operations for 5 tables and 4 custom operations
---

# orm-objects

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM client for the objects API — provides typed CRUD operations for 5 tables and 4 custom operations

## Usage

```typescript
// Import the ORM client
import { db } from './orm';

// Available models: getAllRecord, ref, store, object, commit
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
- [ref](references/ref.md)
- [store](references/store.md)
- [object](references/object.md)
- [commit](references/commit.md)
- [init-empty-repo](references/init-empty-repo.md)
- [set-data-at-path](references/set-data-at-path.md)
- [insert-node-at-path](references/insert-node-at-path.md)
- [provision-bucket](references/provision-bucket.md)
