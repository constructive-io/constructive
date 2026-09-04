---
name: orm-storage
description: ORM client for the storage API — provides typed CRUD operations for 4 tables and 5 custom operations
---

# orm-storage

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM client for the storage API — provides typed CRUD operations for 4 tables and 5 custom operations

## Usage

```typescript
// Import the ORM client
import { db } from './orm';

// Available models: bucket, file, platformBucket, platformFile
db.<model>.findMany({ select: { id: true } }).execute()
db.<model>.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.<model>.create({ data: { ... }, select: { id: true } }).execute()
db.<model>.update({ where: { id: '<UUID>' }, data: { ... }, select: { id: true } }).execute()
db.<model>.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### Query records

```typescript
const items = await db.bucket.findMany({
  select: { id: true }
}).execute();
```

## References

See the `references/` directory for detailed per-entity API documentation:

- [bucket](references/bucket.md)
- [file](references/file.md)
- [platform-bucket](references/platform-bucket.md)
- [platform-file](references/platform-file.md)
- [files-rename](references/files-rename.md)
- [platform-files-rename](references/platform-files-rename.md)
- [provision-bucket](references/provision-bucket.md)
- [upload-platform-file](references/upload-platform-file.md)
- [upload-platform-files](references/upload-platform-files.md)
