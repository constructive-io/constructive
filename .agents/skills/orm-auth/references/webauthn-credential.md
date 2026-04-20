# webauthnCredential

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

WebAuthn/passkey credentials owned by users. One row per registered authenticator (security key, device biometric, synced passkey). Schema mirrors SimpleWebAuthn's canonical Passkey object.

## Usage

```typescript
db.webauthnCredential.findMany({ select: { id: true } }).execute()
db.webauthnCredential.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.webauthnCredential.create({ data: { ownerId: '<UUID>', credentialId: '<String>', publicKey: '<Base64EncodedBinary>', signCount: '<BigInt>', webauthnUserId: '<String>', transports: '<String>', credentialDeviceType: '<String>', backupEligible: '<Boolean>', backupState: '<Boolean>', name: '<String>', lastUsedAt: '<Datetime>' }, select: { id: true } }).execute()
db.webauthnCredential.update({ where: { id: '<UUID>' }, data: { ownerId: '<UUID>' }, select: { id: true } }).execute()
db.webauthnCredential.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all webauthnCredential records

```typescript
const items = await db.webauthnCredential.findMany({
  select: { id: true, ownerId: true }
}).execute();
```

### Create a webauthnCredential

```typescript
const item = await db.webauthnCredential.create({
  data: { ownerId: '<UUID>', credentialId: '<String>', publicKey: '<Base64EncodedBinary>', signCount: '<BigInt>', webauthnUserId: '<String>', transports: '<String>', credentialDeviceType: '<String>', backupEligible: '<Boolean>', backupState: '<Boolean>', name: '<String>', lastUsedAt: '<Datetime>' },
  select: { id: true }
}).execute();
```
