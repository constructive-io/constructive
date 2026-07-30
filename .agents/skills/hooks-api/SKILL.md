---
name: hooks-api
description: React Query hooks for the api API — provides typed query and mutation hooks for 64 tables and 11 custom operations
---

# hooks-api

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for the api API — provides typed query and mutation hooks for 64 tables and 11 custom operations

## Usage

```typescript
// Import hooks
import { useApisQuery } from './hooks';

// Query hooks: use<Model>Query, use<Model>sQuery
// Mutation hooks: useCreate<Model>Mutation, useUpdate<Model>Mutation, useDelete<Model>Mutation
// Bulk mutation hooks (when enabled): useBulkCreate<Model>Mutation, useBulkUpsert<Model>Mutation, etc.

const { data, isLoading } = useApisQuery({
  selection: { fields: { id: true } },
});
```

## Examples

### Query records

```typescript
const { data, isLoading } = useApisQuery({
  selection: { fields: { id: true } },
});
```

## References

See the `references/` directory for detailed per-entity API documentation:

- [api](references/api.md)
- [api-schema](references/api-schema.md)
- [api-setting](references/api-setting.md)
- [ast-migration](references/ast-migration.md)
- [check-constraint](references/check-constraint.md)
- [composite-type](references/composite-type.md)
- [cors-setting](references/cors-setting.md)
- [database](references/database.md)
- [database-setting](references/database-setting.md)
- [database-transfer](references/database-transfer.md)
- [default-privilege](references/default-privilege.md)
- [domain](references/domain.md)
- [domain-event](references/domain-event.md)
- [domain-type](references/domain-type.md)
- [domain-verification](references/domain-verification.md)
- [embedding-chunk](references/embedding-chunk.md)
- [enum](references/enum.md)
- [exclusion-constraint](references/exclusion-constraint.md)
- [field](references/field.md)
- [foreign-key-constraint](references/foreign-key-constraint.md)
- [full-text-search](references/full-text-search.md)
- [function](references/function.md)
- [hostname-binding](references/hostname-binding.md)
- [http-route](references/http-route.md)
- [index](references/index.md)
- [managed-domain](references/managed-domain.md)
- [node-type-registry](references/node-type-registry.md)
- [partition](references/partition.md)
- [platform-api](references/platform-api.md)
- [platform-api-schema](references/platform-api-schema.md)
- [platform-api-setting](references/platform-api-setting.md)
- [platform-cors-setting](references/platform-cors-setting.md)
- [platform-domain](references/platform-domain.md)
- [platform-domain-event](references/platform-domain-event.md)
- [platform-domain-verification](references/platform-domain-verification.md)
- [platform-managed-domain](references/platform-managed-domain.md)
- [platform-site](references/platform-site.md)
- [platform-site-metadatum](references/platform-site-metadatum.md)
- [platform-site-module](references/platform-site-module.md)
- [platform-site-theme](references/platform-site-theme.md)
- [policy](references/policy.md)
- [primary-key-constraint](references/primary-key-constraint.md)
- [pubkey-setting](references/pubkey-setting.md)
- [rls-setting](references/rls-setting.md)
- [route-binding](references/route-binding.md)
- [route](references/route.md)
- [schema](references/schema.md)
- [schema-grant](references/schema-grant.md)
- [site](references/site.md)
- [site-metadatum](references/site-metadatum.md)
- [site-module](references/site-module.md)
- [site-theme](references/site-theme.md)
- [spatial-relation](references/spatial-relation.md)
- [sql-action](references/sql-action.md)
- [table](references/table.md)
- [table-grant](references/table-grant.md)
- [trigger](references/trigger.md)
- [trigger-function](references/trigger-function.md)
- [unique-constraint](references/unique-constraint.md)
- [view](references/view.md)
- [view-grant](references/view-grant.md)
- [view-rule](references/view-rule.md)
- [view-table](references/view-table.md)
- [webauthn-setting](references/webauthn-setting.md)
- [api-schema-names](references/api-schema-names.md)
- [apply-registry-defaults](references/apply-registry-defaults.md)
- [resolve-http-route](references/resolve-http-route.md)
- [resolve-route](references/resolve-route.md)
- [accept-database-transfer](references/accept-database-transfer.md)
- [apply-rls](references/apply-rls.md)
- [cancel-database-transfer](references/cancel-database-transfer.md)
- [provision-bucket](references/provision-bucket.md)
- [reject-database-transfer](references/reject-database-transfer.md)
- [request-database](references/request-database.md)
- [set-field-order](references/set-field-order.md)
