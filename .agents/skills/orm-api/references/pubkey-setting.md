# pubkeySetting

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Per-database public-key crypto auth runtime configuration; typed replacement for api_modules pubkey_challenge JSONB entries

## Usage

```typescript
db.pubkeySetting.findMany({ select: { id: true } }).execute()
db.pubkeySetting.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.pubkeySetting.create({ data: { cryptoNetwork: '<String>', databaseId: '<UUID>', schemaId: '<UUID>', signInRecordFailureFunctionId: '<UUID>', signInRequestChallengeFunctionId: '<UUID>', signInWithChallengeFunctionId: '<UUID>', signUpWithKeyFunctionId: '<UUID>', userField: '<String>' }, select: { id: true } }).execute()
db.pubkeySetting.update({ where: { id: '<UUID>' }, data: { cryptoNetwork: '<String>' }, select: { id: true } }).execute()
db.pubkeySetting.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all pubkeySetting records

```typescript
const items = await db.pubkeySetting.findMany({
  select: { id: true, cryptoNetwork: true }
}).execute();
```

### Create a pubkeySetting

```typescript
const item = await db.pubkeySetting.create({
  data: { cryptoNetwork: '<String>', databaseId: '<UUID>', schemaId: '<UUID>', signInRecordFailureFunctionId: '<UUID>', signInRequestChallengeFunctionId: '<UUID>', signInWithChallengeFunctionId: '<UUID>', signUpWithKeyFunctionId: '<UUID>', userField: '<String>' },
  select: { id: true }
}).execute();
```
