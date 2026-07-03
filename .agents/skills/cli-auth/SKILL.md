---
name: cli-auth
description: CLI tool (csdk) for the auth API — provides CRUD commands for 13 tables and 34 custom operations
---

# cli-auth

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CLI tool (csdk) for the auth API — provides CRUD commands for 13 tables and 34 custom operations

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

# CRUD for any table (e.g. principal)
csdk principal list
csdk principal get --id <value>
csdk principal create --<field> <value>

# Non-interactive mode (skip all prompts, use flags only)
csdk --no-tty principal list
```

## Examples

### Set up and query

```bash
csdk context create local --endpoint http://localhost:5000/graphql
csdk context use local
csdk auth set-token <token>
csdk principal list
```

### Non-interactive mode (for scripts and CI)

```bash
csdk --no-tty principal create --<field> <value>
```

## References

See the `references/` directory for detailed per-entity API documentation:

- [context](references/context.md)
- [auth](references/auth.md)
- [config](references/config.md)
- [principal](references/principal.md)
- [principal-entity](references/principal-entity.md)
- [principal-scope-override](references/principal-scope-override.md)
- [email](references/email.md)
- [phone-number](references/phone-number.md)
- [crypto-address](references/crypto-address.md)
- [webauthn-credential](references/webauthn-credential.md)
- [audit-log-auth](references/audit-log-auth.md)
- [identity-provider](references/identity-provider.md)
- [role-type](references/role-type.md)
- [user-connected-account](references/user-connected-account.md)
- [org-api-key-list](references/org-api-key-list.md)
- [user](references/user.md)
- [current-user-agent](references/current-user-agent.md)
- [current-user-id](references/current-user-id.md)
- [current-ip-address](references/current-ip-address.md)
- [require-step-up](references/require-step-up.md)
- [current-user](references/current-user.md)
- [sign-out](references/sign-out.md)
- [send-account-deletion-email](references/send-account-deletion-email.md)
- [check-password](references/check-password.md)
- [delete-org-principal](references/delete-org-principal.md)
- [disconnect-account](references/disconnect-account.md)
- [revoke-api-key](references/revoke-api-key.md)
- [revoke-session](references/revoke-session.md)
- [verify-password](references/verify-password.md)
- [verify-totp](references/verify-totp.md)
- [confirm-delete-account](references/confirm-delete-account.md)
- [revoke-org-api-key](references/revoke-org-api-key.md)
- [set-password](references/set-password.md)
- [verify-email](references/verify-email.md)
- [provision-new-user](references/provision-new-user.md)
- [reset-password](references/reset-password.md)
- [sign-in-cross-origin](references/sign-in-cross-origin.md)
- [sign-in-sms-otp](references/sign-in-sms-otp.md)
- [sign-up-sms](references/sign-up-sms.md)
- [sign-up](references/sign-up.md)
- [sign-in](references/sign-in.md)
- [link-identity](references/link-identity.md)
- [create-org-principal](references/create-org-principal.md)
- [extend-token-expires](references/extend-token-expires.md)
- [create-org-api-key](references/create-org-api-key.md)
- [create-api-key](references/create-api-key.md)
- [request-cross-origin-token](references/request-cross-origin-token.md)
- [forgot-password](references/forgot-password.md)
- [send-verification-email](references/send-verification-email.md)
- [provision-bucket](references/provision-bucket.md)
