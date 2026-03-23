# permissionsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for PermissionsModule records

## Usage

```typescript
db.permissionsModule.findMany({ select: { id: true } }).execute()
db.permissionsModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.permissionsModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>', defaultTableId: '<UUID>', defaultTableName: '<String>', bitlen: '<Int>', membershipType: '<Int>', entityTableId: '<UUID>', actorTableId: '<UUID>', prefix: '<String>', getPaddedMask: '<String>', getMask: '<String>', getByMask: '<String>', getMaskByName: '<String>' }, select: { id: true } }).execute()
db.permissionsModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.permissionsModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all permissionsModule records

```typescript
const items = await db.permissionsModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a permissionsModule

```typescript
const item = await db.permissionsModule.create({
  data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>', defaultTableId: '<UUID>', defaultTableName: '<String>', bitlen: '<Int>', membershipType: '<Int>', entityTableId: '<UUID>', actorTableId: '<UUID>', prefix: '<String>', getPaddedMask: '<String>', getMask: '<String>', getByMask: '<String>', getMaskByName: '<String>' },
  select: { id: true }
}).execute();
```
