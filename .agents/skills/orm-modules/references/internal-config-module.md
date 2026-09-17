# internalConfigModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Scope-aware plaintext internal config store. No namespace_module dependency and no K8s synchronization: values are read from the database at invocation time. Configuration that must be projected into a Kubernetes ConfigMap belongs in infra_config_module.

## Usage

```typescript
db.internalConfigModule.findMany({ select: { id: true } }).execute()
db.internalConfigModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.internalConfigModule.create({ data: { apiName: '<String>', databaseId: '<UUID>', entityField: '<String>', entityTableId: '<UUID>', internalConfigTableId: '<UUID>', internalConfigTableName: '<String>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>' }, select: { id: true } }).execute()
db.internalConfigModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute()
db.internalConfigModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all internalConfigModule records

```typescript
const items = await db.internalConfigModule.findMany({
  select: { id: true, apiName: true }
}).execute();
```

### Create a internalConfigModule

```typescript
const item = await db.internalConfigModule.create({
  data: { apiName: '<String>', databaseId: '<UUID>', entityField: '<String>', entityTableId: '<UUID>', internalConfigTableId: '<UUID>', internalConfigTableName: '<String>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>' },
  select: { id: true }
}).execute();
```
