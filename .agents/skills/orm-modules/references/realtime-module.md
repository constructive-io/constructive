# realtimeModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for RealtimeModule records

## Usage

```typescript
db.realtimeModule.findMany({ select: { id: true } }).execute()
db.realtimeModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.realtimeModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', subscriptionsSchemaId: '<UUID>', changeLogTableId: '<UUID>', listenerNodeTableId: '<UUID>', sourceRegistryTableId: '<UUID>', retentionHours: '<Int>', premake: '<Int>', interval: '<String>', notifyChannel: '<String>', apiName: '<String>', privateApiName: '<String>' }, select: { id: true } }).execute()
db.realtimeModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.realtimeModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all realtimeModule records

```typescript
const items = await db.realtimeModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a realtimeModule

```typescript
const item = await db.realtimeModule.create({
  data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', subscriptionsSchemaId: '<UUID>', changeLogTableId: '<UUID>', listenerNodeTableId: '<UUID>', sourceRegistryTableId: '<UUID>', retentionHours: '<Int>', premake: '<Int>', interval: '<String>', notifyChannel: '<String>', apiName: '<String>', privateApiName: '<String>' },
  select: { id: true }
}).execute();
```
