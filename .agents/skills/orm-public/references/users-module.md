# usersModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for UsersModule records

## Usage

```typescript
db.usersModule.findMany({ select: { id: true } }).execute()
db.usersModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.usersModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>', typeTableId: '<UUID>', typeTableName: '<String>' }, select: { id: true } }).execute()
db.usersModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.usersModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all usersModule records

```typescript
const items = await db.usersModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a usersModule

```typescript
const item = await db.usersModule.create({
  data: { databaseId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>', typeTableId: '<UUID>', typeTableName: '<String>' },
  select: { id: true }
}).execute();
```
