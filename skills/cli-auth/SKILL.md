---
name: cli-auth
description: CLI tool (csdk) for the auth API — provides CRUD commands for 7 tables and 20 custom operations
---

# cli-auth

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CLI tool (csdk) for the auth API — provides CRUD commands for 7 tables and 20 custom operations

## Usage

```bash
# Context management
csdk context create <name> --endpoint <url>
csdk context use <name>

# Authentication
csdk auth set-token <token>

# CRUD for any table (e.g. role-type)
csdk role-type list
csdk role-type get --id <value>
csdk role-type create --<field> <value>
```

## Examples

### Set up and query

```bash
csdk context create local --endpoint http://localhost:5000/graphql
csdk context use local
csdk auth set-token <token>
csdk role-type list
```

## References

See the `references/` directory for detailed per-entity API documentation:

- [context](references/context.md)
- [auth](references/auth.md)
- [role-type](references/role-type.md)
- [crypto-address](references/crypto-address.md)
- [phone-number](references/phone-number.md)
- [connected-account](references/connected-account.md)
- [audit-log](references/audit-log.md)
- [email](references/email.md)
- [user](references/user.md)
- [current-ip-address](references/current-ip-address.md)
- [current-user-agent](references/current-user-agent.md)
- [current-user-id](references/current-user-id.md)
- [current-user](references/current-user.md)
- [sign-out](references/sign-out.md)
- [send-account-deletion-email](references/send-account-deletion-email.md)
- [check-password](references/check-password.md)
- [confirm-delete-account](references/confirm-delete-account.md)
- [set-password](references/set-password.md)
- [verify-email](references/verify-email.md)
- [reset-password](references/reset-password.md)
- [sign-in-one-time-token](references/sign-in-one-time-token.md)
- [sign-in](references/sign-in.md)
- [sign-up](references/sign-up.md)
- [one-time-token](references/one-time-token.md)
- [extend-token-expires](references/extend-token-expires.md)
- [forgot-password](references/forgot-password.md)
- [send-verification-email](references/send-verification-email.md)
- [verify-password](references/verify-password.md)
- [verify-totp](references/verify-totp.md)
