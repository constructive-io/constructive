# webauthnCredential

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

WebAuthn/passkey credentials owned by users. One row per registered authenticator (security key, device biometric, synced passkey). Schema mirrors SimpleWebAuthn's canonical Passkey object.

## Usage

```typescript
db.webauthnCredential.findMany({ select: { id: true } }).execute()
db.webauthnCredential.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.webauthnCredential.create({ data: { backupEligible: '<Boolean>', backupState: '<Boolean>', credentialDeviceType: '<String>', credentialId: '<String>', lastUsedAt: '<Datetime>', name: '<String>', ownerId: '<UUID>', publicKey: '<Base64EncodedBinary>', signCount: '<BigInt>', transports: '<String>', webauthnUserId: '<String>' }, select: { id: true } }).execute()
db.webauthnCredential.update({ where: { id: '<UUID>' }, data: { backupEligible: '<Boolean>' }, select: { id: true } }).execute()
db.webauthnCredential.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all webauthnCredential records

```typescript
const items = await db.webauthnCredential.findMany({
  select: { id: true, backupEligible: true }
}).execute();
```

### Create a webauthnCredential

```typescript
const item = await db.webauthnCredential.create({
  data: { backupEligible: '<Boolean>', backupState: '<Boolean>', credentialDeviceType: '<String>', credentialId: '<String>', lastUsedAt: '<Datetime>', name: '<String>', ownerId: '<UUID>', publicKey: '<Base64EncodedBinary>', signCount: '<BigInt>', transports: '<String>', webauthnUserId: '<String>' },
  select: { id: true }
}).execute();
```
