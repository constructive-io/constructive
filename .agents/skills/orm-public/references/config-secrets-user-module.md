# configSecretsUserModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for ConfigSecretsUserModule records

## Usage

```typescript
db.configSecretsUserModule.findMany({ select: { id: true } }).execute()
db.configSecretsUserModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.configSecretsUserModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>' }, select: { id: true } }).execute()
db.configSecretsUserModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.configSecretsUserModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all configSecretsUserModule records

```typescript
const items = await db.configSecretsUserModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a configSecretsUserModule

```typescript
const item = await db.configSecretsUserModule.create({
  data: { databaseId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>' },
  select: { id: true }
}).execute();
```
