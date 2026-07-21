# configSecretsUserModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for ConfigSecretsUserModule records

## Usage

```typescript
db.configSecretsUserModule.findMany({ select: { id: true } }).execute()
db.configSecretsUserModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.configSecretsUserModule.create({ data: { apiName: '<String>', databaseId: '<UUID>', entityField: '<String>', privateApiName: '<String>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>' }, select: { id: true } }).execute()
db.configSecretsUserModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute()
db.configSecretsUserModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all configSecretsUserModule records

```typescript
const items = await db.configSecretsUserModule.findMany({
  select: { id: true, apiName: true }
}).execute();
```

### Create a configSecretsUserModule

```typescript
const item = await db.configSecretsUserModule.create({
  data: { apiName: '<String>', databaseId: '<UUID>', entityField: '<String>', privateApiName: '<String>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>' },
  select: { id: true }
}).execute();
```
