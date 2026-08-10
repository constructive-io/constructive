# capabilitiesModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for CapabilitiesModule records

## Usage

```typescript
db.capabilitiesModule.findMany({ select: { id: true } }).execute()
db.capabilitiesModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.capabilitiesModule.create({ data: { actorTableId: '<UUID>', apiName: '<String>', bitlen: '<Int>', databaseId: '<UUID>', defaultTableId: '<UUID>', defaultTableName: '<String>', entityField: '<String>', entityTableId: '<UUID>', getByMask: '<String>', getMask: '<String>', getMaskByName: '<String>', getPaddedMask: '<String>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>', tableId: '<UUID>', tableName: '<String>' }, select: { id: true } }).execute()
db.capabilitiesModule.update({ where: { id: '<UUID>' }, data: { actorTableId: '<UUID>' }, select: { id: true } }).execute()
db.capabilitiesModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all capabilitiesModule records

```typescript
const items = await db.capabilitiesModule.findMany({
  select: { id: true, actorTableId: true }
}).execute();
```

### Create a capabilitiesModule

```typescript
const item = await db.capabilitiesModule.create({
  data: { actorTableId: '<UUID>', apiName: '<String>', bitlen: '<Int>', databaseId: '<UUID>', defaultTableId: '<UUID>', defaultTableName: '<String>', entityField: '<String>', entityTableId: '<UUID>', getByMask: '<String>', getMask: '<String>', getMaskByName: '<String>', getPaddedMask: '<String>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>', tableId: '<UUID>', tableName: '<String>' },
  select: { id: true }
}).execute();
```
