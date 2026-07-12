---
name: cli-modules
description: CLI tool (csdk) for the modules API — provides CRUD commands for 66 tables and 12 custom operations
---

# cli-modules

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CLI tool (csdk) for the modules API — provides CRUD commands for 66 tables and 12 custom operations

## Usage

```bash
# Context management
csdk context create <name> --endpoint <url>
csdk context use <name>

# Authentication
csdk auth set-token <token>

# Config variables
csdk config set <key> <value>
csdk config get <key>

# CRUD for any table (e.g. default-ids-module)
csdk default-ids-module list
csdk default-ids-module get --id <value>
csdk default-ids-module create --<field> <value>

# Non-interactive mode (skip all prompts, use flags only)
csdk --no-tty default-ids-module list
```

## Examples

### Set up and query

```bash
csdk context create local --endpoint http://localhost:5000/graphql
csdk context use local
csdk auth set-token <token>
csdk default-ids-module list
```

### Non-interactive mode (for scripts and CI)

```bash
csdk --no-tty default-ids-module create --<field> <value>
```

## References

See the `references/` directory for detailed per-entity API documentation:

- [context](references/context.md)
- [auth](references/auth.md)
- [config](references/config.md)
- [default-ids-module](references/default-ids-module.md)
- [membership-types-module](references/membership-types-module.md)
- [session-secrets-module](references/session-secrets-module.md)
- [devices-module](references/devices-module.md)
- [i-18-n-module](references/i-18-n-module.md)
- [user-settings-module](references/user-settings-module.md)
- [user-state-module](references/user-state-module.md)
- [user-credentials-module](references/user-credentials-module.md)
- [connected-accounts-module](references/connected-accounts-module.md)
- [emails-module](references/emails-module.md)
- [phone-numbers-module](references/phone-numbers-module.md)
- [rate-limits-module](references/rate-limits-module.md)
- [users-module](references/users-module.md)
- [webauthn-credentials-module](references/webauthn-credentials-module.md)
- [config-secrets-user-module](references/config-secrets-user-module.md)
- [crypto-addresses-module](references/crypto-addresses-module.md)
- [denormalized-table-field](references/denormalized-table-field.md)
- [rls-module](references/rls-module.md)
- [blueprint](references/blueprint.md)
- [blueprint-template](references/blueprint-template.md)
- [blueprint-construction](references/blueprint-construction.md)
- [crypto-auth-module](references/crypto-auth-module.md)
- [sessions-module](references/sessions-module.md)
- [secure-table-provision](references/secure-table-provision.md)
- [identity-providers-module](references/identity-providers-module.md)
- [integration-providers-module](references/integration-providers-module.md)
- [db-pool-config](references/db-pool-config.md)
- [realtime-module](references/realtime-module.md)
- [infra-secrets-module](references/infra-secrets-module.md)
- [internal-secrets-module](references/internal-secrets-module.md)
- [db-preset-module](references/db-preset-module.md)
- [graph-module](references/graph-module.md)
- [rate-limit-meters-module](references/rate-limit-meters-module.md)
- [infra-config-module](references/infra-config-module.md)
- [webauthn-auth-module](references/webauthn-auth-module.md)
- [principal-auth-module](references/principal-auth-module.md)
- [db-pool](references/db-pool.md)
- [function-module](references/function-module.md)
- [merkle-store-module](references/merkle-store-module.md)
- [database-provision-module](references/database-provision-module.md)
- [function-invocation-module](references/function-invocation-module.md)
- [invites-module](references/invites-module.md)
- [namespace-module](references/namespace-module.md)
- [plans-module](references/plans-module.md)
- [compute-log-module](references/compute-log-module.md)
- [inference-log-module](references/inference-log-module.md)
- [storage-log-module](references/storage-log-module.md)
- [transfer-log-module](references/transfer-log-module.md)
- [billing-provider-module](references/billing-provider-module.md)
- [function-deployment-module](references/function-deployment-module.md)
- [permissions-module](references/permissions-module.md)
- [graph-execution-module](references/graph-execution-module.md)
- [hierarchy-module](references/hierarchy-module.md)
- [notifications-module](references/notifications-module.md)
- [relation-provision](references/relation-provision.md)
- [profiles-module](references/profiles-module.md)
- [billing-module](references/billing-module.md)
- [resource-module](references/resource-module.md)
- [user-auth-module](references/user-auth-module.md)
- [db-usage-module](references/db-usage-module.md)
- [agent-module](references/agent-module.md)
- [limits-module](references/limits-module.md)
- [entity-type-provision](references/entity-type-provision.md)
- [storage-module](references/storage-module.md)
- [memberships-module](references/memberships-module.md)
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
