---
name: hooks-config
description: React Query hooks for the config API — provides typed query and mutation hooks for 5 tables and 13 custom operations
---

# hooks-config

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for the config API — provides typed query and mutation hooks for 5 tables and 13 custom operations

## Usage

```typescript
// Import hooks
import { useConfigsQuery } from './hooks';

// Query hooks: use<Model>Query, use<Model>sQuery
// Mutation hooks: useCreate<Model>Mutation, useUpdate<Model>Mutation, useDelete<Model>Mutation
// Bulk mutation hooks (when enabled): useBulkCreate<Model>Mutation, useBulkUpsert<Model>Mutation, etc.

const { data, isLoading } = useConfigsQuery({
  selection: { fields: { id: true } },
});
```

## Examples

### Query records

```typescript
const { data, isLoading } = useConfigsQuery({
  selection: { fields: { id: true } },
});
```

## References

See the `references/` directory for detailed per-entity API documentation:

- [config](references/config.md)
- [platform-config](references/platform-config.md)
- [platform-internal-secret](references/platform-internal-secret.md)
- [platform-secret](references/platform-secret.md)
- [secret](references/secret.md)
- [secrets-del](references/secrets-del.md)
- [secrets-remove-array](references/secrets-remove-array.md)
- [secrets-rotate](references/secrets-rotate.md)
- [secrets-set](references/secrets-set.md)
- [platform-internal-secrets-del](references/platform-internal-secrets-del.md)
- [platform-internal-secrets-remove-array](references/platform-internal-secrets-remove-array.md)
- [platform-internal-secrets-rotate](references/platform-internal-secrets-rotate.md)
- [platform-internal-secrets-set](references/platform-internal-secrets-set.md)
- [platform-secrets-del](references/platform-secrets-del.md)
- [platform-secrets-remove-array](references/platform-secrets-remove-array.md)
- [platform-secrets-rotate](references/platform-secrets-rotate.md)
- [platform-secrets-set](references/platform-secrets-set.md)
- [provision-bucket](references/provision-bucket.md)
