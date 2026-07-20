---
name: hooks-modules
description: React Query hooks for the modules API — provides typed query and mutation hooks for 74 tables and 12 custom operations
---

# hooks-modules

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for the modules API — provides typed query and mutation hooks for 74 tables and 12 custom operations

## Usage

```typescript
// Import hooks
import { useAgentModulesQuery } from './hooks';

// Query hooks: use<Model>Query, use<Model>sQuery
// Mutation hooks: useCreate<Model>Mutation, useUpdate<Model>Mutation, useDelete<Model>Mutation
// Bulk mutation hooks (when enabled): useBulkCreate<Model>Mutation, useBulkUpsert<Model>Mutation, etc.

const { data, isLoading } = useAgentModulesQuery({
  selection: { fields: { id: true } },
});
```

## Examples

### Query records

```typescript
const { data, isLoading } = useAgentModulesQuery({
  selection: { fields: { id: true } },
});
```

## References

See the `references/` directory for detailed per-entity API documentation:

- [agent-module](references/agent-module.md)
- [api-surface-module](references/api-surface-module.md)
- [app-module](references/app-module.md)
- [billing-module](references/billing-module.md)
- [billing-provider-module](references/billing-provider-module.md)
- [blueprint](references/blueprint.md)
- [blueprint-construction](references/blueprint-construction.md)
- [blueprint-template](references/blueprint-template.md)
- [catalog-module](references/catalog-module.md)
- [compute-log-module](references/compute-log-module.md)
- [config-secrets-user-module](references/config-secrets-user-module.md)
- [connected-accounts-module](references/connected-accounts-module.md)
- [crypto-addresses-module](references/crypto-addresses-module.md)
- [crypto-auth-module](references/crypto-auth-module.md)
- [database-provision-module](references/database-provision-module.md)
- [db-pool-config](references/db-pool-config.md)
- [db-pool](references/db-pool.md)
- [db-preset-module](references/db-preset-module.md)
- [db-usage-module](references/db-usage-module.md)
- [default-ids-module](references/default-ids-module.md)
- [denormalized-table-field](references/denormalized-table-field.md)
- [devices-module](references/devices-module.md)
- [domain-module](references/domain-module.md)
- [emails-module](references/emails-module.md)
- [entity-type-provision](references/entity-type-provision.md)
- [events-module](references/events-module.md)
- [function-deployment-module](references/function-deployment-module.md)
- [function-invocation-module](references/function-invocation-module.md)
- [function-module](references/function-module.md)
- [graph-execution-module](references/graph-execution-module.md)
- [graph-module](references/graph-module.md)
- [hierarchy-module](references/hierarchy-module.md)
- [http-route-module](references/http-route-module.md)
- [i-18-n-module](references/i-18-n-module.md)
- [identity-providers-module](references/identity-providers-module.md)
- [inference-log-module](references/inference-log-module.md)
- [infra-config-module](references/infra-config-module.md)
- [infra-secrets-module](references/infra-secrets-module.md)
- [integration-providers-module](references/integration-providers-module.md)
- [internal-secrets-module](references/internal-secrets-module.md)
- [invites-module](references/invites-module.md)
- [limits-module](references/limits-module.md)
- [membership-types-module](references/membership-types-module.md)
- [memberships-module](references/memberships-module.md)
- [merkle-store-module](references/merkle-store-module.md)
- [namespace-module](references/namespace-module.md)
- [notifications-module](references/notifications-module.md)
- [permissions-module](references/permissions-module.md)
- [phone-numbers-module](references/phone-numbers-module.md)
- [plans-module](references/plans-module.md)
- [principal-auth-module](references/principal-auth-module.md)
- [profiles-module](references/profiles-module.md)
- [rate-limit-meters-module](references/rate-limit-meters-module.md)
- [rate-limits-module](references/rate-limits-module.md)
- [realtime-module](references/realtime-module.md)
- [relation-provision](references/relation-provision.md)
- [resource-module](references/resource-module.md)
- [rls-module](references/rls-module.md)
- [route-module](references/route-module.md)
- [secure-table-provision](references/secure-table-provision.md)
- [session-secrets-module](references/session-secrets-module.md)
- [sessions-module](references/sessions-module.md)
- [site-surface-module](references/site-surface-module.md)
- [storage-log-module](references/storage-log-module.md)
- [storage-module](references/storage-module.md)
- [transfer-log-module](references/transfer-log-module.md)
- [user-auth-module](references/user-auth-module.md)
- [user-credentials-module](references/user-credentials-module.md)
- [user-settings-module](references/user-settings-module.md)
- [user-state-module](references/user-state-module.md)
- [users-module](references/users-module.md)
- [webauthn-auth-module](references/webauthn-auth-module.md)
- [webauthn-credentials-module](references/webauthn-credentials-module.md)
- [webhook-module](references/webhook-module.md)
- [resolve-blueprint-field](references/resolve-blueprint-field.md)
- [resolve-blueprint-table](references/resolve-blueprint-table.md)
- [construct-blueprint](references/construct-blueprint.md)
- [copy-template-to-blueprint](references/copy-template-to-blueprint.md)
- [provision-bucket](references/provision-bucket.md)
- [provision-check-constraint](references/provision-check-constraint.md)
- [provision-full-text-search](references/provision-full-text-search.md)
- [provision-index](references/provision-index.md)
- [provision-relation](references/provision-relation.md)
- [provision-spatial-relation](references/provision-spatial-relation.md)
- [provision-table](references/provision-table.md)
- [provision-unique-constraint](references/provision-unique-constraint.md)
