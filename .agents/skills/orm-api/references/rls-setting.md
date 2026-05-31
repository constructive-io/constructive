# rlsSetting

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Per-database RLS module runtime configuration; typed replacement for api_modules rls_module JSONB entries

## Usage

```typescript
db.rlsSetting.findMany({ select: { id: true } }).execute()
db.rlsSetting.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.rlsSetting.create({ data: { databaseId: '<UUID>', authenticateSchemaId: '<UUID>', roleSchemaId: '<UUID>', authenticateFunctionId: '<UUID>', authenticateStrictFunctionId: '<UUID>', currentRoleFunctionId: '<UUID>', currentRoleIdFunctionId: '<UUID>', currentUserAgentFunctionId: '<UUID>', currentIpAddressFunctionId: '<UUID>' }, select: { id: true } }).execute()
db.rlsSetting.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.rlsSetting.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all rlsSetting records

```typescript
const items = await db.rlsSetting.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a rlsSetting

```typescript
const item = await db.rlsSetting.create({
  data: { databaseId: '<UUID>', authenticateSchemaId: '<UUID>', roleSchemaId: '<UUID>', authenticateFunctionId: '<UUID>', authenticateStrictFunctionId: '<UUID>', currentRoleFunctionId: '<UUID>', currentRoleIdFunctionId: '<UUID>', currentUserAgentFunctionId: '<UUID>', currentIpAddressFunctionId: '<UUID>' },
  select: { id: true }
}).execute();
```
