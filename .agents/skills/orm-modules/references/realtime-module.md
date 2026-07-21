# realtimeModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for RealtimeModule records

## Usage

```typescript
db.realtimeModule.findMany({ select: { id: true } }).execute()
db.realtimeModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.realtimeModule.create({ data: { apiName: '<String>', changeLogTableId: '<UUID>', databaseId: '<UUID>', interval: '<String>', listenerNodeTableId: '<UUID>', notifyChannel: '<String>', premake: '<Int>', privateApiName: '<String>', privateSchemaId: '<UUID>', retentionHours: '<Int>', schemaId: '<UUID>', sourceRegistryTableId: '<UUID>', subscriptionsSchemaId: '<UUID>' }, select: { id: true } }).execute()
db.realtimeModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute()
db.realtimeModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all realtimeModule records

```typescript
const items = await db.realtimeModule.findMany({
  select: { id: true, apiName: true }
}).execute();
```

### Create a realtimeModule

```typescript
const item = await db.realtimeModule.create({
  data: { apiName: '<String>', changeLogTableId: '<UUID>', databaseId: '<UUID>', interval: '<String>', listenerNodeTableId: '<UUID>', notifyChannel: '<String>', premake: '<Int>', privateApiName: '<String>', privateSchemaId: '<UUID>', retentionHours: '<Int>', schemaId: '<UUID>', sourceRegistryTableId: '<UUID>', subscriptionsSchemaId: '<UUID>' },
  select: { id: true }
}).execute();
```
