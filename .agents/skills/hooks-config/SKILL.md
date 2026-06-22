---
name: hooks-config
description: React Query hooks for the config API — provides typed query and mutation hooks for 2 tables and 9 custom operations
---

# hooks-config

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for the config API — provides typed query and mutation hooks for 2 tables and 9 custom operations

## Usage

```typescript
// Import hooks
import { usePlatformConfigDefinitionsQuery } from './hooks';

// Query hooks: use<Model>Query, use<Model>sQuery
// Mutation hooks: useCreate<Model>Mutation, useUpdate<Model>Mutation, useDelete<Model>Mutation
// Bulk mutation hooks (when enabled): useBulkCreate<Model>Mutation, useBulkUpsert<Model>Mutation, etc.

const { data, isLoading } = usePlatformConfigDefinitionsQuery({
  selection: { fields: { id: true } },
});
```

## Examples

### Query records

```typescript
const { data, isLoading } = usePlatformConfigDefinitionsQuery({
  selection: { fields: { id: true } },
});
```

## References

See the `references/` directory for detailed per-entity API documentation:

- [platform-config-definition](references/platform-config-definition.md)
- [platform-config](references/platform-config.md)
- [platform-secrets-del](references/platform-secrets-del.md)
- [org-secrets-del](references/org-secrets-del.md)
- [platform-secrets-remove-array](references/platform-secrets-remove-array.md)
- [org-secrets-remove-array](references/org-secrets-remove-array.md)
- [platform-secrets-rotate](references/platform-secrets-rotate.md)
- [platform-secrets-set](references/platform-secrets-set.md)
- [org-secrets-rotate](references/org-secrets-rotate.md)
- [org-secrets-set](references/org-secrets-set.md)
- [provision-bucket](references/provision-bucket.md)
