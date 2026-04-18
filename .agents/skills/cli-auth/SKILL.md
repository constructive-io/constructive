---
name: cli-auth
description: CLI tool (csdk) for the auth API — provides CRUD commands for 7 tables and 28 custom operations
---

# cli-auth

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CLI tool (csdk) for the auth API — provides CRUD commands for 7 tables and 28 custom operations

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

# CRUD for any table (e.g. email)
csdk email list
csdk email get --id <value>
csdk email create --<field> <value>

# Non-interactive mode (skip all prompts, use flags only)
csdk --no-tty email list
```

## Examples

### Set up and query

```bash
csdk context create local --endpoint http://localhost:5000/graphql
csdk context use local
csdk auth set-token <token>
csdk email list
```

### Non-interactive mode (for scripts and CI)

```bash
csdk --no-tty email create --<field> <value>
```

## References

See the `references/` directory for detailed per-entity API documentation:

- [context](references/context.md)
- [auth](references/auth.md)
- [config](references/config.md)
- [email](references/email.md)
- [phone-number](references/phone-number.md)
- [crypto-address](references/crypto-address.md)
- [connected-account](references/connected-account.md)
- [audit-log](references/audit-log.md)
- [role-type](references/role-type.md)
- [user](references/user.md)
- [current-user-agent](references/current-user-agent.md)
- [current-ip-address](references/current-ip-address.md)
- [current-user-id](references/current-user-id.md)
- [require-step-up](references/require-step-up.md)
- [current-user](references/current-user.md)
- [sign-out](references/sign-out.md)
- [send-account-deletion-email](references/send-account-deletion-email.md)
- [check-password](references/check-password.md)
- [revoke-api-key](references/revoke-api-key.md)
- [revoke-session](references/revoke-session.md)
- [verify-password](references/verify-password.md)
- [verify-totp](references/verify-totp.md)
- [confirm-delete-account](references/confirm-delete-account.md)
- [set-password](references/set-password.md)
- [verify-email](references/verify-email.md)
- [provision-new-user](references/provision-new-user.md)
- [reset-password](references/reset-password.md)
- [create-api-key](references/create-api-key.md)
- [sign-in-cross-origin](references/sign-in-cross-origin.md)
- [sign-up](references/sign-up.md)
- [request-cross-origin-token](references/request-cross-origin-token.md)
- [sign-in](references/sign-in.md)
- [extend-token-expires](references/extend-token-expires.md)
- [forgot-password](references/forgot-password.md)
- [send-verification-email](references/send-verification-email.md)
- [request-upload-url](references/request-upload-url.md)
- [confirm-upload](references/confirm-upload.md)
- [provision-bucket](references/provision-bucket.md)
