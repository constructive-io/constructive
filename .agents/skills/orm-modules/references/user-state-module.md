# userStateModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for UserStateModule records

## Usage

```typescript
db.userStateModule.findMany({ select: { id: true } }).execute()
db.userStateModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.userStateModule.create({ data: { databaseId: '<UUID>', entityField: '<String>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>' }, select: { id: true } }).execute()
db.userStateModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.userStateModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all userStateModule records

```typescript
const items = await db.userStateModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a userStateModule

```typescript
const item = await db.userStateModule.create({
  data: { databaseId: '<UUID>', entityField: '<String>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>' },
  select: { id: true }
}).execute();
```
