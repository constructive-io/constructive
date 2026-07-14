# webauthnAuthModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for WebauthnAuthModule records

## Usage

```typescript
db.webauthnAuthModule.findMany({ select: { id: true } }).execute()
db.webauthnAuthModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.webauthnAuthModule.create({ data: { attestationType: '<String>', authSettingsTableId: '<UUID>', challengeExpiry: '<Interval>', credentialsTableId: '<UUID>', databaseId: '<UUID>', originAllowlist: '<String>', requireUserVerification: '<Boolean>', residentKey: '<String>', rpId: '<String>', rpName: '<String>', schemaId: '<UUID>', sessionCredentialsTableId: '<UUID>', sessionSecretsTableId: '<UUID>', sessionsTableId: '<UUID>', usersTableId: '<UUID>' }, select: { id: true } }).execute()
db.webauthnAuthModule.update({ where: { id: '<UUID>' }, data: { attestationType: '<String>' }, select: { id: true } }).execute()
db.webauthnAuthModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all webauthnAuthModule records

```typescript
const items = await db.webauthnAuthModule.findMany({
  select: { id: true, attestationType: true }
}).execute();
```

### Create a webauthnAuthModule

```typescript
const item = await db.webauthnAuthModule.create({
  data: { attestationType: '<String>', authSettingsTableId: '<UUID>', challengeExpiry: '<Interval>', credentialsTableId: '<UUID>', databaseId: '<UUID>', originAllowlist: '<String>', requireUserVerification: '<Boolean>', residentKey: '<String>', rpId: '<String>', rpName: '<String>', schemaId: '<UUID>', sessionCredentialsTableId: '<UUID>', sessionSecretsTableId: '<UUID>', sessionsTableId: '<UUID>', usersTableId: '<UUID>' },
  select: { id: true }
}).execute();
```
