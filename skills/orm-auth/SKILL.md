---
name: orm-auth
description: ORM client for the auth API — provides typed CRUD operations for 7 tables and 20 custom operations
---

# orm-auth

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM client for the auth API — provides typed CRUD operations for 7 tables and 20 custom operations

## Usage

```typescript
// Import the ORM client
import { db } from './orm';

// Available models: roleType, cryptoAddress, phoneNumber, connectedAccount, auditLog, email, user
db.<model>.findMany({ select: { id: true } }).execute()
db.<model>.findOne({ id: '<value>', select: { id: true } }).execute()
db.<model>.create({ data: { ... }, select: { id: true } }).execute()
db.<model>.update({ where: { id: '<value>' }, data: { ... }, select: { id: true } }).execute()
db.<model>.delete({ where: { id: '<value>' } }).execute()
```

## Examples

### Query records

```typescript
const items = await db.roleType.findMany({
  select: { id: true }
}).execute();
```

## References

See the `references/` directory for detailed per-entity API documentation:

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
