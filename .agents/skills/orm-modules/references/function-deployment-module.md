# functionDeploymentModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for FunctionDeploymentModule records

## Usage

```typescript
db.functionDeploymentModule.findMany({ select: { id: true } }).execute()
db.functionDeploymentModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.functionDeploymentModule.create({ data: { databaseId: '<UUID>', entityField: '<String>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', deploymentsTableId: '<UUID>', deploymentEventsTableId: '<UUID>', deploymentsTableName: '<String>', deploymentEventsTableName: '<String>', apiName: '<String>', privateApiName: '<String>', scope: '<String>', prefix: '<String>', entityTableId: '<UUID>', functionModuleId: '<UUID>', namespaceModuleId: '<UUID>', policies: '<JSON>', provisions: '<JSON>', defaultPermissions: '<String>' }, select: { id: true } }).execute()
db.functionDeploymentModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.functionDeploymentModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all functionDeploymentModule records

```typescript
const items = await db.functionDeploymentModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a functionDeploymentModule

```typescript
const item = await db.functionDeploymentModule.create({
  data: { databaseId: '<UUID>', entityField: '<String>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', deploymentsTableId: '<UUID>', deploymentEventsTableId: '<UUID>', deploymentsTableName: '<String>', deploymentEventsTableName: '<String>', apiName: '<String>', privateApiName: '<String>', scope: '<String>', prefix: '<String>', entityTableId: '<UUID>', functionModuleId: '<UUID>', namespaceModuleId: '<UUID>', policies: '<JSON>', provisions: '<JSON>', defaultPermissions: '<String>' },
  select: { id: true }
}).execute();
```
