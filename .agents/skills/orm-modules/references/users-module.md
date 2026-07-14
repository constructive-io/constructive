# usersModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for UsersModule records

## Usage

```typescript
db.usersModule.findMany({ select: { id: true } }).execute()
db.usersModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.usersModule.create({ data: { apiName: '<String>', databaseId: '<UUID>', privateApiName: '<String>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>', typeTableId: '<UUID>', typeTableName: '<String>' }, select: { id: true } }).execute()
db.usersModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute()
db.usersModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all usersModule records

```typescript
const items = await db.usersModule.findMany({
  select: { id: true, apiName: true }
}).execute();
```

### Create a usersModule

```typescript
const item = await db.usersModule.create({
  data: { apiName: '<String>', databaseId: '<UUID>', privateApiName: '<String>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>', typeTableId: '<UUID>', typeTableName: '<String>' },
  select: { id: true }
}).execute();
```
