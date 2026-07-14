# permissionsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for PermissionsModule records

## Usage

```typescript
db.permissionsModule.findMany({ select: { id: true } }).execute()
db.permissionsModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.permissionsModule.create({ data: { actorTableId: '<UUID>', apiName: '<String>', bitlen: '<Int>', databaseId: '<UUID>', defaultTableId: '<UUID>', defaultTableName: '<String>', entityField: '<String>', entityTableId: '<UUID>', getByMask: '<String>', getMask: '<String>', getMaskByName: '<String>', getPaddedMask: '<String>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>', tableId: '<UUID>', tableName: '<String>' }, select: { id: true } }).execute()
db.permissionsModule.update({ where: { id: '<UUID>' }, data: { actorTableId: '<UUID>' }, select: { id: true } }).execute()
db.permissionsModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all permissionsModule records

```typescript
const items = await db.permissionsModule.findMany({
  select: { id: true, actorTableId: true }
}).execute();
```

### Create a permissionsModule

```typescript
const item = await db.permissionsModule.create({
  data: { actorTableId: '<UUID>', apiName: '<String>', bitlen: '<Int>', databaseId: '<UUID>', defaultTableId: '<UUID>', defaultTableName: '<String>', entityField: '<String>', entityTableId: '<UUID>', getByMask: '<String>', getMask: '<String>', getMaskByName: '<String>', getPaddedMask: '<String>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>', tableId: '<UUID>', tableName: '<String>' },
  select: { id: true }
}).execute();
```
