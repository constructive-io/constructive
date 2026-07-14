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

// Available models: commit, getAllRecord, object, ref, store
db.<model>.findMany({ select: { id: true } }).execute()
db.<model>.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.<model>.create({ data: { ... }, select: { id: true } }).execute()
db.<model>.update({ where: { id: '<UUID>' }, data: { ... }, select: { id: true } }).execute()
db.<model>.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### Query records

```typescript
const items = await db.commit.findMany({
  select: { id: true }
}).execute();
```

## References

See the `references/` directory for detailed per-entity API documentation:

- [commit](references/commit.md)
- [get-all-record](references/get-all-record.md)
- [object](references/object.md)
- [ref](references/ref.md)
- [store](references/store.md)
- [init-empty-repo](references/init-empty-repo.md)
- [insert-node-at-path](references/insert-node-at-path.md)
- [provision-bucket](references/provision-bucket.md)
- [set-data-at-path](references/set-data-at-path.md)
