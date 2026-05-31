# webauthnSetting

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Per-database WebAuthn/passkey runtime configuration; typed replacement for api_modules webauthn_challenge JSONB entries

## Usage

```typescript
db.webauthnSetting.findMany({ select: { id: true } }).execute()
db.webauthnSetting.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.webauthnSetting.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', credentialsSchemaId: '<UUID>', sessionsSchemaId: '<UUID>', sessionSecretsSchemaId: '<UUID>', credentialsTableId: '<UUID>', sessionsTableId: '<UUID>', sessionCredentialsTableId: '<UUID>', sessionSecretsTableId: '<UUID>', userFieldId: '<UUID>', rpId: '<String>', rpName: '<String>', originAllowlist: '<String>', attestationType: '<String>', requireUserVerification: '<Boolean>', residentKey: '<String>', challengeExpirySeconds: '<BigInt>' }, select: { id: true } }).execute()
db.webauthnSetting.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.webauthnSetting.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all webauthnSetting records

```typescript
const items = await db.webauthnSetting.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a webauthnSetting

```typescript
const item = await db.webauthnSetting.create({
  data: { databaseId: '<UUID>', schemaId: '<UUID>', credentialsSchemaId: '<UUID>', sessionsSchemaId: '<UUID>', sessionSecretsSchemaId: '<UUID>', credentialsTableId: '<UUID>', sessionsTableId: '<UUID>', sessionCredentialsTableId: '<UUID>', sessionSecretsTableId: '<UUID>', userFieldId: '<UUID>', rpId: '<String>', rpName: '<String>', originAllowlist: '<String>', attestationType: '<String>', requireUserVerification: '<Boolean>', residentKey: '<String>', challengeExpirySeconds: '<BigInt>' },
  select: { id: true }
}).execute();
```
