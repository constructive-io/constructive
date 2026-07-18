---
name: orm-auth
description: ORM client for the auth API — provides typed CRUD operations for 13 tables and 35 custom operations
---

# orm-auth

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM client for the auth API — provides typed CRUD operations for 13 tables and 35 custom operations

## Usage

```typescript
// Import the ORM client
import { db } from './orm';

// Available models: auditLogAuth, cryptoAddress, email, identityProvider, orgApiKeyList, phoneNumber, principal, principalEntity, ...
db.<model>.findMany({ select: { id: true } }).execute()
db.<model>.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.<model>.create({ data: { ... }, select: { id: true } }).execute()
db.<model>.update({ where: { id: '<UUID>' }, data: { ... }, select: { id: true } }).execute()
db.<model>.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### Query records

```typescript
const items = await db.auditLogAuth.findMany({
  select: { id: true }
}).execute();
```

## References

See the `references/` directory for detailed per-entity API documentation:

- [audit-log-auth](references/audit-log-auth.md)
- [crypto-address](references/crypto-address.md)
- [email](references/email.md)
- [identity-provider](references/identity-provider.md)
- [org-api-key-list](references/org-api-key-list.md)
- [phone-number](references/phone-number.md)
- [principal](references/principal.md)
- [principal-entity](references/principal-entity.md)
- [principal-scope-override](references/principal-scope-override.md)
- [role-type](references/role-type.md)
- [user-connected-account](references/user-connected-account.md)
- [user](references/user.md)
- [webauthn-credential](references/webauthn-credential.md)
- [current-ip-address](references/current-ip-address.md)
- [current-user](references/current-user.md)
- [current-user-agent](references/current-user-agent.md)
- [current-user-id](references/current-user-id.md)
- [require-step-up](references/require-step-up.md)
- [check-password](references/check-password.md)
- [confirm-delete-account](references/confirm-delete-account.md)
- [create-api-key](references/create-api-key.md)
- [create-org-api-key](references/create-org-api-key.md)
- [create-org-principal](references/create-org-principal.md)
- [delete-org-principal](references/delete-org-principal.md)
- [delete-principal](references/delete-principal.md)
- [disconnect-account](references/disconnect-account.md)
- [extend-token-expires](references/extend-token-expires.md)
- [forgot-password](references/forgot-password.md)
- [link-identity](references/link-identity.md)
- [provision-bucket](references/provision-bucket.md)
- [provision-new-user](references/provision-new-user.md)
- [request-cross-origin-token](references/request-cross-origin-token.md)
- [reset-password](references/reset-password.md)
- [revoke-api-key](references/revoke-api-key.md)
- [revoke-org-api-key](references/revoke-org-api-key.md)
- [revoke-session](references/revoke-session.md)
- [send-account-deletion-email](references/send-account-deletion-email.md)
- [send-verification-email](references/send-verification-email.md)
- [set-password](references/set-password.md)
- [sign-in](references/sign-in.md)
- [sign-in-cross-origin](references/sign-in-cross-origin.md)
- [sign-in-sms-otp](references/sign-in-sms-otp.md)
- [sign-out](references/sign-out.md)
- [sign-up](references/sign-up.md)
- [sign-up-sms](references/sign-up-sms.md)
- [verify-email](references/verify-email.md)
- [verify-password](references/verify-password.md)
- [verify-totp](references/verify-totp.md)
