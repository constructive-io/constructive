# infraConfigModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Namespace-backed plaintext key-value config module. Requires namespace_module and emits namespace:sync_config job triggers for K8s ConfigMap synchronization.

## Usage

```typescript
db.infraConfigModule.findMany({ select: { id: true } }).execute()
db.infraConfigModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.infraConfigModule.create({ data: { apiName: '<String>', configTableId: '<UUID>', configTableName: '<String>', databaseId: '<UUID>', entityField: '<String>', entityTableId: '<UUID>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>' }, select: { id: true } }).execute()
db.infraConfigModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute()
db.infraConfigModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all infraConfigModule records

```typescript
const items = await db.infraConfigModule.findMany({
  select: { id: true, apiName: true }
}).execute();
```

### Create a infraConfigModule

```typescript
const item = await db.infraConfigModule.create({
  data: { apiName: '<String>', configTableId: '<UUID>', configTableName: '<String>', databaseId: '<UUID>', entityField: '<String>', entityTableId: '<UUID>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>' },
  select: { id: true }
}).execute();
```
