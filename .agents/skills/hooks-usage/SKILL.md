---
name: hooks-usage
description: React Query hooks for the usage API — provides typed query and mutation hooks for 18 tables and 5 custom operations
---

# hooks-usage

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for the usage API — provides typed query and mutation hooks for 18 tables and 5 custom operations

## Usage

```typescript
// Import hooks
import { useAppLimitCapsDefaultsQuery } from './hooks';

// Query hooks: use<Model>Query, use<Model>sQuery
// Mutation hooks: useCreate<Model>Mutation, useUpdate<Model>Mutation, useDelete<Model>Mutation
// Bulk mutation hooks (when enabled): useBulkCreate<Model>Mutation, useBulkUpsert<Model>Mutation, etc.

const { data, isLoading } = useAppLimitCapsDefaultsQuery({
  selection: { fields: { id: true } },
});
```

## Examples

### Query records

```typescript
const { data, isLoading } = useAppLimitCapsDefaultsQuery({
  selection: { fields: { id: true } },
});
```

## References

See the `references/` directory for detailed per-entity API documentation:

- [app-limit-caps-default](references/app-limit-caps-default.md)
- [org-limit-caps-default](references/org-limit-caps-default.md)
- [app-limit-cap](references/app-limit-cap.md)
- [org-limit-cap](references/org-limit-cap.md)
- [app-limit-default](references/app-limit-default.md)
- [app-limit-credit](references/app-limit-credit.md)
- [app-limit-credit-code-item](references/app-limit-credit-code-item.md)
- [app-limit-credit-redemption](references/app-limit-credit-redemption.md)
- [org-limit-default](references/org-limit-default.md)
- [org-limit-credit](references/org-limit-credit.md)
- [app-limit-warning](references/app-limit-warning.md)
- [org-limit-warning](references/org-limit-warning.md)
- [app-limit-credit-code](references/app-limit-credit-code.md)
- [app-limit-event](references/app-limit-event.md)
- [org-limit-event](references/org-limit-event.md)
- [app-limit](references/app-limit.md)
- [org-limit-aggregate](references/org-limit-aggregate.md)
- [org-limit](references/org-limit.md)
- [seed-app-limit-caps-defaults](references/seed-app-limit-caps-defaults.md)
- [seed-app-limit-defaults](references/seed-app-limit-defaults.md)
- [seed-org-limit-caps-defaults](references/seed-org-limit-caps-defaults.md)
- [seed-org-limit-defaults](references/seed-org-limit-defaults.md)
- [provision-bucket](references/provision-bucket.md)
