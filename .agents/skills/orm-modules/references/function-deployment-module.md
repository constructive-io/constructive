# functionDeploymentModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for FunctionDeploymentModule records

## Usage

```typescript
db.functionDeploymentModule.findMany({ select: { id: true } }).execute()
db.functionDeploymentModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.functionDeploymentModule.create({ data: { apiName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', deploymentEventsTableId: '<UUID>', deploymentEventsTableName: '<String>', deploymentsTableId: '<UUID>', deploymentsTableName: '<String>', entityField: '<String>', entityTableId: '<UUID>', functionModuleId: '<UUID>', namespaceModuleId: '<UUID>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>' }, select: { id: true } }).execute()
db.functionDeploymentModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute()
db.functionDeploymentModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all functionDeploymentModule records

```typescript
const items = await db.functionDeploymentModule.findMany({
  select: { id: true, apiName: true }
}).execute();
```

### Create a functionDeploymentModule

```typescript
const item = await db.functionDeploymentModule.create({
  data: { apiName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', deploymentEventsTableId: '<UUID>', deploymentEventsTableName: '<String>', deploymentsTableId: '<UUID>', deploymentsTableName: '<String>', entityField: '<String>', entityTableId: '<UUID>', functionModuleId: '<UUID>', namespaceModuleId: '<UUID>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>' },
  select: { id: true }
}).execute();
```
