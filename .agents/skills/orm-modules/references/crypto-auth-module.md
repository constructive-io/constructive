# cryptoAuthModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for CryptoAuthModule records

## Usage

```typescript
db.cryptoAuthModule.findMany({ select: { id: true } }).execute()
db.cryptoAuthModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.cryptoAuthModule.create({ data: { addressesTableId: '<UUID>', cryptoNetwork: '<String>', databaseId: '<UUID>', schemaId: '<UUID>', secretsTableId: '<UUID>', sessionCredentialsTableId: '<UUID>', sessionsTableId: '<UUID>', signInRecordFailure: '<String>', signInRequestChallenge: '<String>', signInWithChallenge: '<String>', signUpWithKey: '<String>', userField: '<String>', usersTableId: '<UUID>' }, select: { id: true } }).execute()
db.cryptoAuthModule.update({ where: { id: '<UUID>' }, data: { addressesTableId: '<UUID>' }, select: { id: true } }).execute()
db.cryptoAuthModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all cryptoAuthModule records

```typescript
const items = await db.cryptoAuthModule.findMany({
  select: { id: true, addressesTableId: true }
}).execute();
```

### Create a cryptoAuthModule

```typescript
const item = await db.cryptoAuthModule.create({
  data: { addressesTableId: '<UUID>', cryptoNetwork: '<String>', databaseId: '<UUID>', schemaId: '<UUID>', secretsTableId: '<UUID>', sessionCredentialsTableId: '<UUID>', sessionsTableId: '<UUID>', signInRecordFailure: '<String>', signInRequestChallenge: '<String>', signInWithChallenge: '<String>', signUpWithKey: '<String>', userField: '<String>', usersTableId: '<UUID>' },
  select: { id: true }
}).execute();
```
