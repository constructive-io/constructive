---
name: cli-api
description: CLI tool (csdk) for the api API — provides CRUD commands for 86 tables and 16 custom operations
---

# cli-api

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CLI tool (csdk) for the api API — provides CRUD commands for 86 tables and 16 custom operations

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

# CRUD for any table (e.g. api)
csdk api list
csdk api get --id <value>
csdk api create --<field> <value>

# Non-interactive mode (skip all prompts, use flags only)
csdk --no-tty api list
```

## Examples

### Set up and query

```bash
csdk context create local --endpoint http://localhost:5000/graphql
csdk context use local
csdk auth set-token <token>
csdk api list
```

### Non-interactive mode (for scripts and CI)

```bash
csdk --no-tty api create --<field> <value>
```

## References

See the `references/` directory for detailed per-entity API documentation:

- [context](references/context.md)
- [auth](references/auth.md)
- [config](references/config.md)
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
- [derive](references/derive.md)
- [domain](references/domain.md)
- [domain-event](references/domain-event.md)
- [domain-type](references/domain-type.md)
- [domain-verification](references/domain-verification.md)
- [email-identity](references/email-identity.md)
- [email-provider-account](references/email-provider-account.md)
- [email-site-identity](references/email-site-identity.md)
- [embedding-chunk](references/embedding-chunk.md)
- [enum](references/enum.md)
- [exclusion-constraint](references/exclusion-constraint.md)
- [field-behavior](references/field-behavior.md)
- [field](references/field.md)
- [foreign-key-constraint-behavior](references/foreign-key-constraint-behavior.md)
- [foreign-key-constraint](references/foreign-key-constraint.md)
- [full-text-search](references/full-text-search.md)
- [function](references/function.md)
- [hostname-binding](references/hostname-binding.md)
- [index](references/index.md)
- [managed-domain](references/managed-domain.md)
- [node-type-registry](references/node-type-registry.md)
- [page](references/page.md)
- [partition](references/partition.md)
- [platform-api](references/platform-api.md)
- [platform-api-schema](references/platform-api-schema.md)
- [platform-api-setting](references/platform-api-setting.md)
- [platform-cors-setting](references/platform-cors-setting.md)
- [platform-domain](references/platform-domain.md)
- [platform-domain-event](references/platform-domain-event.md)
- [platform-domain-verification](references/platform-domain-verification.md)
- [platform-email-identity](references/platform-email-identity.md)
- [platform-email-provider-account](references/platform-email-provider-account.md)
- [platform-email-site-identity](references/platform-email-site-identity.md)
- [platform-managed-domain](references/platform-managed-domain.md)
- [platform-page](references/platform-page.md)
- [platform-site-app-link](references/platform-site-app-link.md)
- [platform-site](references/platform-site.md)
- [platform-site-deep-link](references/platform-site-deep-link.md)
- [platform-site-error-page](references/platform-site-error-page.md)
- [platform-site-metadatum](references/platform-site-metadatum.md)
- [platform-site-module](references/platform-site-module.md)
- [platform-site-theme](references/platform-site-theme.md)
- [platform-site-web-config](references/platform-site-web-config.md)
- [policy](references/policy.md)
- [primary-key-constraint](references/primary-key-constraint.md)
- [pubkey-setting](references/pubkey-setting.md)
- [redirect](references/redirect.md)
- [rls-setting](references/rls-setting.md)
- [route-binding](references/route-binding.md)
- [route](references/route.md)
- [schema](references/schema.md)
- [schema-grant](references/schema-grant.md)
- [site-app-link](references/site-app-link.md)
- [site](references/site.md)
- [site-deep-link](references/site-deep-link.md)
- [site-error-page](references/site-error-page.md)
- [site-metadatum](references/site-metadatum.md)
- [site-module](references/site-module.md)
- [site-theme](references/site-theme.md)
- [site-web-config](references/site-web-config.md)
- [spatial-relation](references/spatial-relation.md)
- [sql-action](references/sql-action.md)
- [table-behavior](references/table-behavior.md)
- [table](references/table.md)
- [table-grant](references/table-grant.md)
- [trigger](references/trigger.md)
- [trigger-function](references/trigger-function.md)
- [unique-constraint-behavior](references/unique-constraint-behavior.md)
- [unique-constraint](references/unique-constraint.md)
- [view-behavior](references/view-behavior.md)
- [view](references/view.md)
- [view-grant](references/view-grant.md)
- [view-rule](references/view-rule.md)
- [view-table](references/view-table.md)
- [webauthn-setting](references/webauthn-setting.md)
- [api-schema-names](references/api-schema-names.md)
- [apply-registry-defaults](references/apply-registry-defaults.md)
- [resolve-deep-link](references/resolve-deep-link.md)
- [resolve-route](references/resolve-route.md)
- [resolve-site-app-links](references/resolve-site-app-links.md)
- [accept-database-transfer](references/accept-database-transfer.md)
- [apply-rls](references/apply-rls.md)
- [cancel-database-transfer](references/cancel-database-transfer.md)
- [domains-assign-subdomain](references/domains-assign-subdomain.md)
- [platform-domains-assign-subdomain](references/platform-domains-assign-subdomain.md)
- [platform-sites-provision-static-site](references/platform-sites-provision-static-site.md)
- [provision-bucket](references/provision-bucket.md)
- [reject-database-transfer](references/reject-database-transfer.md)
- [request-database](references/request-database.md)
- [set-field-order](references/set-field-order.md)
- [sites-provision-static-site](references/sites-provision-static-site.md)
