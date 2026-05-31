# pubkeySetting

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Per-database public-key crypto auth runtime configuration; typed replacement for api_modules pubkey_challenge JSONB entries

## Usage

```typescript
db.pubkeySetting.findMany({ select: { id: true } }).execute()
db.pubkeySetting.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.pubkeySetting.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', cryptoNetwork: '<String>', userField: '<String>', signUpWithKeyFunctionId: '<UUID>', signInRequestChallengeFunctionId: '<UUID>', signInRecordFailureFunctionId: '<UUID>', signInWithChallengeFunctionId: '<UUID>' }, select: { id: true } }).execute()
db.pubkeySetting.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.pubkeySetting.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all pubkeySetting records

```typescript
const items = await db.pubkeySetting.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a pubkeySetting

```typescript
const item = await db.pubkeySetting.create({
  data: { databaseId: '<UUID>', schemaId: '<UUID>', cryptoNetwork: '<String>', userField: '<String>', signUpWithKeyFunctionId: '<UUID>', signInRequestChallengeFunctionId: '<UUID>', signInRecordFailureFunctionId: '<UUID>', signInWithChallengeFunctionId: '<UUID>' },
  select: { id: true }
}).execute();
```
