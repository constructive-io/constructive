# cryptoAuthModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for CryptoAuthModule records

## Usage

```typescript
db.cryptoAuthModule.findMany({ select: { id: true } }).execute()
db.cryptoAuthModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.cryptoAuthModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', usersTableId: '<UUID>', secretsTableId: '<UUID>', sessionsTableId: '<UUID>', sessionCredentialsTableId: '<UUID>', addressesTableId: '<UUID>', userField: '<String>', cryptoNetwork: '<String>', signInRequestChallenge: '<String>', signInRecordFailure: '<String>', signUpWithKey: '<String>', signInWithChallenge: '<String>' }, select: { id: true } }).execute()
db.cryptoAuthModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.cryptoAuthModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all cryptoAuthModule records

```typescript
const items = await db.cryptoAuthModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a cryptoAuthModule

```typescript
const item = await db.cryptoAuthModule.create({
  data: { databaseId: '<UUID>', schemaId: '<UUID>', usersTableId: '<UUID>', secretsTableId: '<UUID>', sessionsTableId: '<UUID>', sessionCredentialsTableId: '<UUID>', addressesTableId: '<UUID>', userField: '<String>', cryptoNetwork: '<String>', signInRequestChallenge: '<String>', signInRecordFailure: '<String>', signUpWithKey: '<String>', signInWithChallenge: '<String>' },
  select: { id: true }
}).execute();
```
