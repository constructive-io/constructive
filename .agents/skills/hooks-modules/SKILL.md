---
name: hooks-modules
description: React Query hooks for the modules API — provides typed query and mutation hooks for 61 tables and 12 custom operations
---

# hooks-modules

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for the modules API — provides typed query and mutation hooks for 61 tables and 12 custom operations

## Usage

```typescript
// Import hooks
import { useDefaultIdsModulesQuery } from './hooks';

// Query hooks: use<Model>Query, use<Model>sQuery
// Mutation hooks: useCreate<Model>Mutation, useUpdate<Model>Mutation, useDelete<Model>Mutation
// Bulk mutation hooks (when enabled): useBulkCreate<Model>Mutation, useBulkUpsert<Model>Mutation, etc.

const { data, isLoading } = useDefaultIdsModulesQuery({
  selection: { fields: { id: true } },
});
```

## Examples

### Query records

```typescript
const { data, isLoading } = useDefaultIdsModulesQuery({
  selection: { fields: { id: true } },
});
```

## References

See the `references/` directory for detailed per-entity API documentation:

- [default-ids-module](references/default-ids-module.md)
- [membership-types-module](references/membership-types-module.md)
- [user-state-module](references/user-state-module.md)
- [session-secrets-module](references/session-secrets-module.md)
- [config-secrets-org-module](references/config-secrets-org-module.md)
- [devices-module](references/devices-module.md)
- [i-18-n-module](references/i-18-n-module.md)
- [user-credentials-module](references/user-credentials-module.md)
- [user-settings-module](references/user-settings-module.md)
- [config-secrets-user-module](references/config-secrets-user-module.md)
- [connected-accounts-module](references/connected-accounts-module.md)
- [emails-module](references/emails-module.md)
- [phone-numbers-module](references/phone-numbers-module.md)
- [rate-limits-module](references/rate-limits-module.md)
- [users-module](references/users-module.md)
- [webauthn-credentials-module](references/webauthn-credentials-module.md)
- [crypto-addresses-module](references/crypto-addresses-module.md)
- [denormalized-table-field](references/denormalized-table-field.md)
- [identity-providers-module](references/identity-providers-module.md)
- [rls-module](references/rls-module.md)
- [blueprint](references/blueprint.md)
- [blueprint-template](references/blueprint-template.md)
- [blueprint-construction](references/blueprint-construction.md)
- [crypto-auth-module](references/crypto-auth-module.md)
- [sessions-module](references/sessions-module.md)
- [secure-table-provision](references/secure-table-provision.md)
- [database-provision-module](references/database-provision-module.md)
- [config-secrets-module](references/config-secrets-module.md)
- [graph-module](references/graph-module.md)
- [merkle-store-module](references/merkle-store-module.md)
- [rate-limit-meters-module](references/rate-limit-meters-module.md)
- [realtime-module](references/realtime-module.md)
- [webauthn-auth-module](references/webauthn-auth-module.md)
- [function-invocation-module](references/function-invocation-module.md)
- [function-module](references/function-module.md)
- [invites-module](references/invites-module.md)
- [principal-auth-module](references/principal-auth-module.md)
- [compute-log-module](references/compute-log-module.md)
- [inference-log-module](references/inference-log-module.md)
- [namespace-module](references/namespace-module.md)
- [resource-module](references/resource-module.md)
- [storage-log-module](references/storage-log-module.md)
- [transfer-log-module](references/transfer-log-module.md)
- [function-deployment-module](references/function-deployment-module.md)
- [plans-module](references/plans-module.md)
- [billing-provider-module](references/billing-provider-module.md)
- [db-usage-module](references/db-usage-module.md)
- [graph-execution-module](references/graph-execution-module.md)
- [hierarchy-module](references/hierarchy-module.md)
- [permissions-module](references/permissions-module.md)
- [notifications-module](references/notifications-module.md)
- [profiles-module](references/profiles-module.md)
- [billing-module](references/billing-module.md)
- [relation-provision](references/relation-provision.md)
- [user-auth-module](references/user-auth-module.md)
- [agent-module](references/agent-module.md)
- [limits-module](references/limits-module.md)
- [memberships-module](references/memberships-module.md)
- [entity-type-provision](references/entity-type-provision.md)
- [storage-module](references/storage-module.md)
- [events-module](references/events-module.md)
- [resolve-blueprint-field](references/resolve-blueprint-field.md)
- [resolve-blueprint-table](references/resolve-blueprint-table.md)
- [construct-blueprint](references/construct-blueprint.md)
- [provision-full-text-search](references/provision-full-text-search.md)
- [provision-index](references/provision-index.md)
- [provision-check-constraint](references/provision-check-constraint.md)
- [provision-unique-constraint](references/provision-unique-constraint.md)
- [copy-template-to-blueprint](references/copy-template-to-blueprint.md)
- [provision-spatial-relation](references/provision-spatial-relation.md)
- [provision-table](references/provision-table.md)
- [provision-relation](references/provision-relation.md)
- [provision-bucket](references/provision-bucket.md)
