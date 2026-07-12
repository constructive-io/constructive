---
name: cli-api
description: CLI tool (csdk) for the api API — provides CRUD commands for 46 tables and 8 custom operations
---

# cli-api

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CLI tool (csdk) for the api API — provides CRUD commands for 46 tables and 8 custom operations

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

# CRUD for any table (e.g. function)
csdk function list
csdk function get --id <value>
csdk function create --<field> <value>

# Non-interactive mode (skip all prompts, use flags only)
csdk --no-tty function list
```

## Examples

### Set up and query

```bash
csdk context create local --endpoint http://localhost:5000/graphql
csdk context use local
csdk auth set-token <token>
csdk function list
```

### Non-interactive mode (for scripts and CI)

```bash
csdk --no-tty function create --<field> <value>
```

## References

See the `references/` directory for detailed per-entity API documentation:

- [context](references/context.md)
- [auth](references/auth.md)
- [config](references/config.md)
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
