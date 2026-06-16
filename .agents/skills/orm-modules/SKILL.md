---
name: orm-modules
description: ORM client for the modules API — provides typed CRUD operations for 57 tables and 12 custom operations
---

# orm-modules

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM client for the modules API — provides typed CRUD operations for 57 tables and 12 custom operations

## Usage

```typescript
// Import the ORM client
import { db } from './orm';

// Available models: defaultIdsModule, membershipTypesModule, userStateModule, sessionSecretsModule, configSecretsOrgModule, devicesModule, i18NModule, userCredentialsModule, ...
db.<model>.findMany({ select: { id: true } }).execute()
db.<model>.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.<model>.create({ data: { ... }, select: { id: true } }).execute()
db.<model>.update({ where: { id: '<UUID>' }, data: { ... }, select: { id: true } }).execute()
db.<model>.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### Query records

```typescript
const items = await db.defaultIdsModule.findMany({
  select: { id: true }
}).execute();
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
- [merkle-store-module](references/merkle-store-module.md)
- [graph-module](references/graph-module.md)
- [database-provision-module](references/database-provision-module.md)
- [config-secrets-module](references/config-secrets-module.md)
- [rate-limit-meters-module](references/rate-limit-meters-module.md)
- [realtime-module](references/realtime-module.md)
- [webauthn-auth-module](references/webauthn-auth-module.md)
- [function-invocation-module](references/function-invocation-module.md)
- [function-module](references/function-module.md)
- [invites-module](references/invites-module.md)
- [namespace-module](references/namespace-module.md)
- [compute-log-module](references/compute-log-module.md)
- [inference-log-module](references/inference-log-module.md)
- [storage-log-module](references/storage-log-module.md)
- [transfer-log-module](references/transfer-log-module.md)
- [plans-module](references/plans-module.md)
- [billing-provider-module](references/billing-provider-module.md)
- [db-usage-module](references/db-usage-module.md)
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
