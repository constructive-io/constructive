---
name: hooks-config
description: React Query hooks for the config API — provides typed query and mutation hooks for 9 tables and 21 custom operations
---

# hooks-config

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for the config API — provides typed query and mutation hooks for 9 tables and 21 custom operations

## Usage

```typescript
// Import hooks
import { useAppInternalSecretsQuery } from './hooks';

// Query hooks: use<Model>Query, use<Model>sQuery
// Mutation hooks: useCreate<Model>Mutation, useUpdate<Model>Mutation, useDelete<Model>Mutation
// Bulk mutation hooks (when enabled): useBulkCreate<Model>Mutation, useBulkUpsert<Model>Mutation, etc.

const { data, isLoading } = useAppInternalSecretsQuery({
  selection: { fields: { id: true } },
});
```

## Examples

### Query records

```typescript
const { data, isLoading } = useAppInternalSecretsQuery({
  selection: { fields: { id: true } },
});
```

## References

See the `references/` directory for detailed per-entity API documentation:

- [app-internal-secret](references/app-internal-secret.md)
- [config](references/config.md)
- [internal-config](references/internal-config.md)
- [internal-secret](references/internal-secret.md)
- [platform-config](references/platform-config.md)
- [platform-internal-config](references/platform-internal-config.md)
- [platform-internal-secret](references/platform-internal-secret.md)
- [platform-secret](references/platform-secret.md)
- [secret](references/secret.md)
- [internal-secrets-del](references/internal-secrets-del.md)
- [internal-secrets-remove-array](references/internal-secrets-remove-array.md)
- [internal-secrets-rotate](references/internal-secrets-rotate.md)
- [internal-secrets-set](references/internal-secrets-set.md)
- [secrets-del](references/secrets-del.md)
- [secrets-remove-array](references/secrets-remove-array.md)
- [secrets-rotate](references/secrets-rotate.md)
- [secrets-set](references/secrets-set.md)
- [app-internal-secrets-del](references/app-internal-secrets-del.md)
- [app-internal-secrets-remove-array](references/app-internal-secrets-remove-array.md)
- [app-internal-secrets-rotate](references/app-internal-secrets-rotate.md)
- [app-internal-secrets-set](references/app-internal-secrets-set.md)
- [platform-internal-secrets-del](references/platform-internal-secrets-del.md)
- [platform-internal-secrets-remove-array](references/platform-internal-secrets-remove-array.md)
- [platform-internal-secrets-rotate](references/platform-internal-secrets-rotate.md)
- [platform-internal-secrets-set](references/platform-internal-secrets-set.md)
- [platform-secrets-del](references/platform-secrets-del.md)
- [platform-secrets-remove-array](references/platform-secrets-remove-array.md)
- [platform-secrets-rotate](references/platform-secrets-rotate.md)
- [platform-secrets-set](references/platform-secrets-set.md)
- [provision-bucket](references/provision-bucket.md)
