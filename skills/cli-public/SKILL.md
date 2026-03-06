---
name: cli-public
description: CLI tool (csdk) for the public API — provides CRUD commands for 104 tables and 50 custom operations
---

# cli-public

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CLI tool (csdk) for the public API — provides CRUD commands for 104 tables and 50 custom operations

## Usage

```bash
# Context management
csdk context create <name> --endpoint <url>
csdk context use <name>

# Authentication
csdk auth set-token <token>

# CRUD for any table (e.g. org-get-managers-record)
csdk org-get-managers-record list
csdk org-get-managers-record get --id <value>
csdk org-get-managers-record create --<field> <value>

# Non-interactive mode (skip all prompts, use flags only)
csdk --no-tty org-get-managers-record list
```

## Examples

### Set up and query

```bash
csdk context create local --endpoint http://localhost:5000/graphql
csdk context use local
csdk auth set-token <token>
csdk org-get-managers-record list
```

### Non-interactive mode (for scripts and CI)

```bash
csdk --no-tty org-get-managers-record create --<field> <value>
```

## References

See the `references/` directory for detailed per-entity API documentation:

- [context](references/context.md)
- [auth](references/auth.md)
- [org-get-managers-record](references/org-get-managers-record.md)
- [org-get-subordinates-record](references/org-get-subordinates-record.md)
- [get-all-record](references/get-all-record.md)
- [app-permission](references/app-permission.md)
- [org-permission](references/org-permission.md)
- [object](references/object.md)
- [app-level-requirement](references/app-level-requirement.md)
- [database](references/database.md)
- [schema](references/schema.md)
- [table](references/table.md)
- [check-constraint](references/check-constraint.md)
- [field](references/field.md)
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
- [table-module](references/table-module.md)
- [table-template-module](references/table-template-module.md)
- [secure-table-provision](references/secure-table-provision.md)
- [relation-provision](references/relation-provision.md)
- [schema-grant](references/schema-grant.md)
- [default-privilege](references/default-privilege.md)
- [api-schema](references/api-schema.md)
- [api-module](references/api-module.md)
- [domain](references/domain.md)
- [site-metadatum](references/site-metadatum.md)
- [site-module](references/site-module.md)
- [site-theme](references/site-theme.md)
- [trigger-function](references/trigger-function.md)
- [api](references/api.md)
- [site](references/site.md)
- [app](references/app.md)
- [connected-accounts-module](references/connected-accounts-module.md)
- [crypto-addresses-module](references/crypto-addresses-module.md)
- [crypto-auth-module](references/crypto-auth-module.md)
- [default-ids-module](references/default-ids-module.md)
- [denormalized-table-field](references/denormalized-table-field.md)
- [emails-module](references/emails-module.md)
- [encrypted-secrets-module](references/encrypted-secrets-module.md)
- [field-module](references/field-module.md)
- [invites-module](references/invites-module.md)
- [levels-module](references/levels-module.md)
- [limits-module](references/limits-module.md)
- [membership-types-module](references/membership-types-module.md)
- [memberships-module](references/memberships-module.md)
- [permissions-module](references/permissions-module.md)
- [phone-numbers-module](references/phone-numbers-module.md)
- [profiles-module](references/profiles-module.md)
- [rls-module](references/rls-module.md)
- [secrets-module](references/secrets-module.md)
- [sessions-module](references/sessions-module.md)
- [user-auth-module](references/user-auth-module.md)
- [users-module](references/users-module.md)
- [uuid-module](references/uuid-module.md)
- [database-provision-module](references/database-provision-module.md)
- [app-admin-grant](references/app-admin-grant.md)
- [app-owner-grant](references/app-owner-grant.md)
- [app-grant](references/app-grant.md)
- [org-membership](references/org-membership.md)
- [org-member](references/org-member.md)
- [org-admin-grant](references/org-admin-grant.md)
- [org-owner-grant](references/org-owner-grant.md)
- [org-grant](references/org-grant.md)
- [org-chart-edge](references/org-chart-edge.md)
- [org-chart-edge-grant](references/org-chart-edge-grant.md)
- [app-limit](references/app-limit.md)
- [org-limit](references/org-limit.md)
- [app-step](references/app-step.md)
- [app-achievement](references/app-achievement.md)
- [invite](references/invite.md)
- [claimed-invite](references/claimed-invite.md)
- [org-invite](references/org-invite.md)
- [org-claimed-invite](references/org-claimed-invite.md)
- [ref](references/ref.md)
- [store](references/store.md)
- [app-permission-default](references/app-permission-default.md)
- [role-type](references/role-type.md)
- [org-permission-default](references/org-permission-default.md)
- [crypto-address](references/crypto-address.md)
- [app-limit-default](references/app-limit-default.md)
- [org-limit-default](references/org-limit-default.md)
- [connected-account](references/connected-account.md)
- [phone-number](references/phone-number.md)
- [membership-type](references/membership-type.md)
- [node-type-registry](references/node-type-registry.md)
- [app-membership-default](references/app-membership-default.md)
- [commit](references/commit.md)
- [org-membership-default](references/org-membership-default.md)
- [audit-log](references/audit-log.md)
- [app-level](references/app-level.md)
- [email](references/email.md)
- [sql-migration](references/sql-migration.md)
- [ast-migration](references/ast-migration.md)
- [user](references/user.md)
- [app-membership](references/app-membership.md)
- [hierarchy-module](references/hierarchy-module.md)
- [current-user-id](references/current-user-id.md)
- [current-ip-address](references/current-ip-address.md)
- [current-user-agent](references/current-user-agent.md)
- [app-permissions-get-padded-mask](references/app-permissions-get-padded-mask.md)
- [org-permissions-get-padded-mask](references/org-permissions-get-padded-mask.md)
- [steps-achieved](references/steps-achieved.md)
- [rev-parse](references/rev-parse.md)
- [org-is-manager-of](references/org-is-manager-of.md)
- [app-permissions-get-mask](references/app-permissions-get-mask.md)
- [org-permissions-get-mask](references/org-permissions-get-mask.md)
- [app-permissions-get-mask-by-names](references/app-permissions-get-mask-by-names.md)
- [org-permissions-get-mask-by-names](references/org-permissions-get-mask-by-names.md)
- [app-permissions-get-by-mask](references/app-permissions-get-by-mask.md)
- [org-permissions-get-by-mask](references/org-permissions-get-by-mask.md)
- [get-all-objects-from-root](references/get-all-objects-from-root.md)
- [get-path-objects-from-root](references/get-path-objects-from-root.md)
- [get-object-at-path](references/get-object-at-path.md)
- [steps-required](references/steps-required.md)
- [current-user](references/current-user.md)
- [sign-out](references/sign-out.md)
- [send-account-deletion-email](references/send-account-deletion-email.md)
- [check-password](references/check-password.md)
- [submit-invite-code](references/submit-invite-code.md)
- [submit-org-invite-code](references/submit-org-invite-code.md)
- [freeze-objects](references/freeze-objects.md)
- [init-empty-repo](references/init-empty-repo.md)
- [confirm-delete-account](references/confirm-delete-account.md)
- [set-password](references/set-password.md)
- [verify-email](references/verify-email.md)
- [reset-password](references/reset-password.md)
- [remove-node-at-path](references/remove-node-at-path.md)
- [bootstrap-user](references/bootstrap-user.md)
- [set-data-at-path](references/set-data-at-path.md)
- [set-props-and-commit](references/set-props-and-commit.md)
- [provision-database-with-user](references/provision-database-with-user.md)
- [sign-in-one-time-token](references/sign-in-one-time-token.md)
- [create-user-database](references/create-user-database.md)
- [extend-token-expires](references/extend-token-expires.md)
- [sign-in](references/sign-in.md)
- [sign-up](references/sign-up.md)
- [set-field-order](references/set-field-order.md)
- [one-time-token](references/one-time-token.md)
- [insert-node-at-path](references/insert-node-at-path.md)
- [update-node-at-path](references/update-node-at-path.md)
- [set-and-commit](references/set-and-commit.md)
- [apply-rls](references/apply-rls.md)
- [forgot-password](references/forgot-password.md)
- [send-verification-email](references/send-verification-email.md)
- [verify-password](references/verify-password.md)
- [verify-totp](references/verify-totp.md)
