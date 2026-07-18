# webhookModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for WebhookModule records

## Usage

```typescript
db.webhookModule.findMany({ select: { id: true } }).execute()
db.webhookModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.webhookModule.create({ data: { apiName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', entityField: '<String>', entityTableId: '<UUID>', functionInvocationModuleId: '<UUID>', functionModuleId: '<UUID>', infraSecretsModuleId: '<UUID>', namespaceModuleId: '<UUID>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>', webhookEndpointsTableId: '<UUID>', webhookEndpointsTableName: '<String>', webhookEventsTableId: '<UUID>', webhookEventsTableName: '<String>' }, select: { id: true } }).execute()
db.webhookModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute()
db.webhookModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all webhookModule records

```typescript
const items = await db.webhookModule.findMany({
  select: { id: true, apiName: true }
}).execute();
```

### Create a webhookModule

```typescript
const item = await db.webhookModule.create({
  data: { apiName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', entityField: '<String>', entityTableId: '<UUID>', functionInvocationModuleId: '<UUID>', functionModuleId: '<UUID>', infraSecretsModuleId: '<UUID>', namespaceModuleId: '<UUID>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>', webhookEndpointsTableId: '<UUID>', webhookEndpointsTableName: '<String>', webhookEventsTableId: '<UUID>', webhookEventsTableName: '<String>' },
  select: { id: true }
}).execute();
```
