# webauthnCredential

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

WebAuthn/passkey credentials owned by users. One row per registered authenticator (security key, device biometric, synced passkey). Schema mirrors SimpleWebAuthn's canonical Passkey object.

## Usage

```typescript
useWebauthnCredentialsQuery({ selection: { fields: { backupEligible: true, backupState: true, createdAt: true, credentialDeviceType: true, credentialId: true, id: true, lastUsedAt: true, name: true, ownerId: true, publicKey: true, signCount: true, transports: true, updatedAt: true, webauthnUserId: true } } })
useWebauthnCredentialQuery({ id: '<UUID>', selection: { fields: { backupEligible: true, backupState: true, createdAt: true, credentialDeviceType: true, credentialId: true, id: true, lastUsedAt: true, name: true, ownerId: true, publicKey: true, signCount: true, transports: true, updatedAt: true, webauthnUserId: true } } })
useCreateWebauthnCredentialMutation({ selection: { fields: { id: true } } })
useUpdateWebauthnCredentialMutation({ selection: { fields: { id: true } } })
useDeleteWebauthnCredentialMutation({})
```

## Examples

### List all webauthnCredentials

```typescript
const { data, isLoading } = useWebauthnCredentialsQuery({
  selection: { fields: { backupEligible: true, backupState: true, createdAt: true, credentialDeviceType: true, credentialId: true, id: true, lastUsedAt: true, name: true, ownerId: true, publicKey: true, signCount: true, transports: true, updatedAt: true, webauthnUserId: true } },
});
```

### Create a webauthnCredential

```typescript
const { mutate } = useCreateWebauthnCredentialMutation({
  selection: { fields: { id: true } },
});
mutate({ backupEligible: '<Boolean>', backupState: '<Boolean>', credentialDeviceType: '<String>', credentialId: '<String>', lastUsedAt: '<Datetime>', name: '<String>', ownerId: '<UUID>', publicKey: '<Base64EncodedBinary>', signCount: '<BigInt>', transports: '<String>', webauthnUserId: '<String>' });
```
