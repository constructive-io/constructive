# webauthnSetting

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

WebAuthn/passkey runtime configuration; relying party options and typed references to the credential/session storage

## Usage

```typescript
db.webauthnSetting.findMany({ select: { id: true } }).execute()
db.webauthnSetting.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.webauthnSetting.create({ data: { attestationType: '<String>', challengeExpirySeconds: '<BigInt>', credentialsSchemaId: '<UUID>', credentialsTableId: '<UUID>', databaseId: '<UUID>', originAllowlist: '<String>', requireUserVerification: '<Boolean>', residentKey: '<String>', rpId: '<String>', rpName: '<String>', schemaId: '<UUID>', sessionCredentialsTableId: '<UUID>', sessionSecretsSchemaId: '<UUID>', sessionSecretsTableId: '<UUID>', sessionsSchemaId: '<UUID>', sessionsTableId: '<UUID>', userFieldId: '<UUID>' }, select: { id: true } }).execute()
db.webauthnSetting.update({ where: { id: '<UUID>' }, data: { attestationType: '<String>' }, select: { id: true } }).execute()
db.webauthnSetting.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all webauthnSetting records

```typescript
const items = await db.webauthnSetting.findMany({
  select: { id: true, attestationType: true }
}).execute();
```

### Create a webauthnSetting

```typescript
const item = await db.webauthnSetting.create({
  data: { attestationType: '<String>', challengeExpirySeconds: '<BigInt>', credentialsSchemaId: '<UUID>', credentialsTableId: '<UUID>', databaseId: '<UUID>', originAllowlist: '<String>', requireUserVerification: '<Boolean>', residentKey: '<String>', rpId: '<String>', rpName: '<String>', schemaId: '<UUID>', sessionCredentialsTableId: '<UUID>', sessionSecretsSchemaId: '<UUID>', sessionSecretsTableId: '<UUID>', sessionsSchemaId: '<UUID>', sessionsTableId: '<UUID>', userFieldId: '<UUID>' },
  select: { id: true }
}).execute();
```
