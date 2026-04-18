---
name: hooks-auth
description: React Query hooks for the auth API — provides typed query and mutation hooks for 7 tables and 29 custom operations
---

# hooks-auth

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for the auth API — provides typed query and mutation hooks for 7 tables and 29 custom operations

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
- [audit-log](references/audit-log.md)
- [role-type](references/role-type.md)
- [user-connected-account](references/user-connected-account.md)
- [user](references/user.md)
- [current-user-agent](references/current-user-agent.md)
- [current-ip-address](references/current-ip-address.md)
- [current-user-id](references/current-user-id.md)
- [require-step-up](references/require-step-up.md)
- [current-user](references/current-user.md)
- [sign-out](references/sign-out.md)
- [send-account-deletion-email](references/send-account-deletion-email.md)
- [check-password](references/check-password.md)
- [disconnect-account](references/disconnect-account.md)
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
