# webauthnAuthModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for WebauthnAuthModule records

## Usage

```typescript
db.webauthnAuthModule.findMany({ select: { id: true } }).execute()
db.webauthnAuthModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.webauthnAuthModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', usersTableId: '<UUID>', credentialsTableId: '<UUID>', sessionsTableId: '<UUID>', sessionCredentialsTableId: '<UUID>', sessionSecretsTableId: '<UUID>', authSettingsTableId: '<UUID>', rpId: '<String>', rpName: '<String>', originAllowlist: '<String>', attestationType: '<String>', requireUserVerification: '<Boolean>', residentKey: '<String>', challengeExpiry: '<Interval>' }, select: { id: true } }).execute()
db.webauthnAuthModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.webauthnAuthModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all webauthnAuthModule records

```typescript
const items = await db.webauthnAuthModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a webauthnAuthModule

```typescript
const item = await db.webauthnAuthModule.create({
  data: { databaseId: '<UUID>', schemaId: '<UUID>', usersTableId: '<UUID>', credentialsTableId: '<UUID>', sessionsTableId: '<UUID>', sessionCredentialsTableId: '<UUID>', sessionSecretsTableId: '<UUID>', authSettingsTableId: '<UUID>', rpId: '<String>', rpName: '<String>', originAllowlist: '<String>', attestationType: '<String>', requireUserVerification: '<Boolean>', residentKey: '<String>', challengeExpiry: '<Interval>' },
  select: { id: true }
}).execute();
```
