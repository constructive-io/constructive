# integrationProvidersModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Config row for the integration_providers_module, which provisions a per-database
     integration_providers table holding branded, reusable service definitions.
     Integration providers act as a catalog of external services (e.g. Mailgun, Postgres)
     and list the canonical secret/config names required to use them.
     Other modules (function_module, resource_module) match the provider slug as a string.

## Usage

```typescript
db.integrationProvidersModule.findMany({ select: { id: true } }).execute()
db.integrationProvidersModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.integrationProvidersModule.create({ data: { databaseId: '<UUID>', entityField: '<String>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', tableId: '<UUID>', tableName: '<String>', apiName: '<String>', privateApiName: '<String>', scope: '<String>', prefix: '<String>', entityTableId: '<UUID>' }, select: { id: true } }).execute()
db.integrationProvidersModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.integrationProvidersModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all integrationProvidersModule records

```typescript
const items = await db.integrationProvidersModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a integrationProvidersModule

```typescript
const item = await db.integrationProvidersModule.create({
  data: { databaseId: '<UUID>', entityField: '<String>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', tableId: '<UUID>', tableName: '<String>', apiName: '<String>', privateApiName: '<String>', scope: '<String>', prefix: '<String>', entityTableId: '<UUID>' },
  select: { id: true }
}).execute();
```
