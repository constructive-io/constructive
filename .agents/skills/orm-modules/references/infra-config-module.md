# infraConfigModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Namespace-backed plaintext key-value config module. Requires namespace_module and emits namespace:sync_config job triggers for K8s ConfigMap synchronization.

## Usage

```typescript
db.infraConfigModule.findMany({ select: { id: true } }).execute()
db.infraConfigModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.infraConfigModule.create({ data: { databaseId: '<UUID>', entityField: '<String>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', configTableId: '<UUID>', configTableName: '<String>', apiName: '<String>', privateApiName: '<String>', scope: '<String>', prefix: '<String>', entityTableId: '<UUID>', policies: '<JSON>', provisions: '<JSON>' }, select: { id: true } }).execute()
db.infraConfigModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.infraConfigModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all infraConfigModule records

```typescript
const items = await db.infraConfigModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a infraConfigModule

```typescript
const item = await db.infraConfigModule.create({
  data: { databaseId: '<UUID>', entityField: '<String>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', configTableId: '<UUID>', configTableName: '<String>', apiName: '<String>', privateApiName: '<String>', scope: '<String>', prefix: '<String>', entityTableId: '<UUID>', policies: '<JSON>', provisions: '<JSON>' },
  select: { id: true }
}).execute();
```
