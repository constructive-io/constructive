# userCredentialsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Per-user bcrypt credential store (password hashes, API key hashes).
     Always user-scoped with AuthzDirectOwner RLS. Consumed by user_auth_module,
     identity_providers_module, and bootstrap procedures.

## Usage

```typescript
db.userCredentialsModule.findMany({ select: { id: true } }).execute()
db.userCredentialsModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.userCredentialsModule.create({ data: { databaseId: '<UUID>', entityField: '<String>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>', privateApiName: '<String>' }, select: { id: true } }).execute()
db.userCredentialsModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.userCredentialsModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all userCredentialsModule records

```typescript
const items = await db.userCredentialsModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a userCredentialsModule

```typescript
const item = await db.userCredentialsModule.create({
  data: { databaseId: '<UUID>', entityField: '<String>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>', privateApiName: '<String>' },
  select: { id: true }
}).execute();
```
