# encryptedSecretsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for EncryptedSecretsModule records

## Usage

```typescript
db.encryptedSecretsModule.findMany({ select: { id: true } }).execute()
db.encryptedSecretsModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.encryptedSecretsModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>' }, select: { id: true } }).execute()
db.encryptedSecretsModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.encryptedSecretsModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all encryptedSecretsModule records

```typescript
const items = await db.encryptedSecretsModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a encryptedSecretsModule

```typescript
const item = await db.encryptedSecretsModule.create({
  data: { databaseId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>' },
  select: { id: true }
}).execute();
```
