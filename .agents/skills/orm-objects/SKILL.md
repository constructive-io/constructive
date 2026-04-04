---
name: orm-objects
description: ORM client for the objects API — provides typed CRUD operations for 5 tables and 15 custom operations
---

# orm-objects

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM client for the objects API — provides typed CRUD operations for 5 tables and 15 custom operations

## Usage

```typescript
// Import the ORM client
import { db } from './orm';

// Available models: getAllRecord, object, ref, store, commit
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
- [request-upload-url](references/request-upload-url.md)
- [confirm-upload](references/confirm-upload.md)
- [provision-bucket](references/provision-bucket.md)
