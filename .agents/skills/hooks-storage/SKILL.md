---
name: hooks-storage
description: React Query hooks for the storage API — provides typed query and mutation hooks for 4 tables and 7 custom operations
---

# hooks-storage

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for the storage API — provides typed query and mutation hooks for 4 tables and 7 custom operations

## Usage

```typescript
// Import hooks
import { useBucketsQuery } from './hooks';

// Query hooks: use<Model>Query, use<Model>sQuery
// Mutation hooks: useCreate<Model>Mutation, useUpdate<Model>Mutation, useDelete<Model>Mutation
// Bulk mutation hooks (when enabled): useBulkCreate<Model>Mutation, useBulkUpsert<Model>Mutation, etc.

const { data, isLoading } = useBucketsQuery({
  selection: { fields: { id: true } },
});
```

## Examples

### Query records

```typescript
const { data, isLoading } = useBucketsQuery({
  selection: { fields: { id: true } },
});
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
- [upload-file](references/upload-file.md)
- [upload-files](references/upload-files.md)
- [upload-platform-file](references/upload-platform-file.md)
- [upload-platform-files](references/upload-platform-files.md)
