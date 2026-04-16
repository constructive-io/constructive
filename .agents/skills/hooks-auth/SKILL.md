---
name: hooks-auth
description: React Query hooks for the auth API — provides typed query and mutation hooks for 7 tables and 23 custom operations
---

# hooks-auth

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for the auth API — provides typed query and mutation hooks for 7 tables and 23 custom operations

## Usage

```typescript
// Import hooks
import { useEmailsQuery } from './hooks';

// Query hooks: use<Model>Query, use<Model>sQuery
// Mutation hooks: useCreate<Model>Mutation, useUpdate<Model>Mutation, useDelete<Model>Mutation

const { data, isLoading } = useEmailsQuery({
  selection: { fields: { id: true } },
});
```

## Examples

### Query records

```typescript
const { data, isLoading } = useEmailsQuery({
  selection: { fields: { id: true } },
});
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
- [current-ip-address](references/current-ip-address.md)
- [current-user-agent](references/current-user-agent.md)
- [current-user-id](references/current-user-id.md)
- [current-user](references/current-user.md)
- [sign-out](references/sign-out.md)
- [send-account-deletion-email](references/send-account-deletion-email.md)
- [check-password](references/check-password.md)
- [verify-password](references/verify-password.md)
- [verify-totp](references/verify-totp.md)
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
- [request-upload-url](references/request-upload-url.md)
- [confirm-upload](references/confirm-upload.md)
- [provision-bucket](references/provision-bucket.md)
