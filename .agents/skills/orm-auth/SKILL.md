---
name: orm-auth
description: ORM client for the auth API — provides typed CRUD operations for 7 tables and 28 custom operations
---

# orm-auth

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM client for the auth API — provides typed CRUD operations for 7 tables and 28 custom operations

## Usage

```typescript
// Import the ORM client
import { db } from './orm';

// Available models: email, phoneNumber, cryptoAddress, connectedAccount, auditLog, roleType, user
db.<model>.findMany({ select: { id: true } }).execute()
db.<model>.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.<model>.create({ data: { ... }, select: { id: true } }).execute()
db.<model>.update({ where: { id: '<UUID>' }, data: { ... }, select: { id: true } }).execute()
db.<model>.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### Query records

```typescript
const items = await db.email.findMany({
  select: { id: true }
}).execute();
```

## References

See the `references/` directory for detailed per-entity API documentation:

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
