---
name: hooks-api
description: React Query hooks for the api API — provides typed query and mutation hooks for 46 tables and 8 custom operations
---

# hooks-api

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for the api API — provides typed query and mutation hooks for 46 tables and 8 custom operations

## Usage

```typescript
// Import hooks
import { useFunctionsQuery } from './hooks';

// Query hooks: use<Model>Query, use<Model>sQuery
// Mutation hooks: useCreate<Model>Mutation, useUpdate<Model>Mutation, useDelete<Model>Mutation
// Bulk mutation hooks (when enabled): useBulkCreate<Model>Mutation, useBulkUpsert<Model>Mutation, etc.

const { data, isLoading } = useFunctionsQuery({
  selection: { fields: { id: true } },
});
```

## Examples

### Query records

```typescript
const { data, isLoading } = useFunctionsQuery({
  selection: { fields: { id: true } },
});
```

## References

See the `references/` directory for detailed per-entity API documentation:

- [function](references/function.md)
- [schema](references/schema.md)
- [table](references/table.md)
- [check-constraint](references/check-constraint.md)
- [field](references/field.md)
- [spatial-relation](references/spatial-relation.md)
- [foreign-key-constraint](references/foreign-key-constraint.md)
- [full-text-search](references/full-text-search.md)
- [index](references/index.md)
- [policy](references/policy.md)
- [primary-key-constraint](references/primary-key-constraint.md)
- [table-grant](references/table-grant.md)
- [trigger](references/trigger.md)
- [unique-constraint](references/unique-constraint.md)
- [view](references/view.md)
- [view-table](references/view-table.md)
- [view-grant](references/view-grant.md)
- [view-rule](references/view-rule.md)
- [embedding-chunk](references/embedding-chunk.md)
- [schema-grant](references/schema-grant.md)
- [default-privilege](references/default-privilege.md)
- [enum](references/enum.md)
- [composite-type](references/composite-type.md)
- [api-schema](references/api-schema.md)
- [api-module](references/api-module.md)
- [domain](references/domain.md)
- [site-metadatum](references/site-metadatum.md)
- [site-module](references/site-module.md)
- [site-theme](references/site-theme.md)
- [cors-setting](references/cors-setting.md)
- [trigger-function](references/trigger-function.md)
- [partition](references/partition.md)
- [database-transfer](references/database-transfer.md)
- [api](references/api.md)
- [site](references/site.md)
- [app](references/app.md)
- [api-setting](references/api-setting.md)
- [migrate-file](references/migrate-file.md)
- [node-type-registry](references/node-type-registry.md)
- [pubkey-setting](references/pubkey-setting.md)
- [database](references/database.md)
- [rls-setting](references/rls-setting.md)
- [sql-action](references/sql-action.md)
- [database-setting](references/database-setting.md)
- [ast-migration](references/ast-migration.md)
- [webauthn-setting](references/webauthn-setting.md)
- [apply-registry-defaults](references/apply-registry-defaults.md)
- [accept-database-transfer](references/accept-database-transfer.md)
- [cancel-database-transfer](references/cancel-database-transfer.md)
- [reject-database-transfer](references/reject-database-transfer.md)
- [set-field-order](references/set-field-order.md)
- [apply-rls](references/apply-rls.md)
- [request-database](references/request-database.md)
- [provision-bucket](references/provision-bucket.md)
