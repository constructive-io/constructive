# webauthnCredential

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

WebAuthn/passkey credentials owned by users. One row per registered authenticator (security key, device biometric, synced passkey). Schema mirrors SimpleWebAuthn's canonical Passkey object.

## Usage

```typescript
useWebauthnCredentialsQuery({ selection: { fields: { id: true, ownerId: true, credentialId: true, publicKey: true, signCount: true, webauthnUserId: true, transports: true, credentialDeviceType: true, backupEligible: true, backupState: true, name: true, lastUsedAt: true, createdAt: true, updatedAt: true } } })
useWebauthnCredentialQuery({ id: '<UUID>', selection: { fields: { id: true, ownerId: true, credentialId: true, publicKey: true, signCount: true, webauthnUserId: true, transports: true, credentialDeviceType: true, backupEligible: true, backupState: true, name: true, lastUsedAt: true, createdAt: true, updatedAt: true } } })
useCreateWebauthnCredentialMutation({ selection: { fields: { id: true } } })
useUpdateWebauthnCredentialMutation({ selection: { fields: { id: true } } })
useDeleteWebauthnCredentialMutation({})
```

## Examples

### List all webauthnCredentials

```typescript
const { data, isLoading } = useWebauthnCredentialsQuery({
  selection: { fields: { id: true, ownerId: true, credentialId: true, publicKey: true, signCount: true, webauthnUserId: true, transports: true, credentialDeviceType: true, backupEligible: true, backupState: true, name: true, lastUsedAt: true, createdAt: true, updatedAt: true } },
});
```

### Create a webauthnCredential

```typescript
const { mutate } = useCreateWebauthnCredentialMutation({
  selection: { fields: { id: true } },
});
mutate({ ownerId: '<UUID>', credentialId: '<String>', publicKey: '<Base64EncodedBinary>', signCount: '<BigInt>', webauthnUserId: '<String>', transports: '<String>', credentialDeviceType: '<String>', backupEligible: '<Boolean>', backupState: '<Boolean>', name: '<String>', lastUsedAt: '<Datetime>' });
```
