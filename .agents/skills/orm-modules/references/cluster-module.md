# clusterModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for ClusterModule records

## Usage

```typescript
db.clusterModule.findMany({ select: { id: true } }).execute()
db.clusterModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.clusterModule.create({ data: { apiName: '<String>', clusterEventsTableId: '<UUID>', clusterEventsTableName: '<String>', clustersTableId: '<UUID>', clustersTableName: '<String>', databaseId: '<UUID>', databasePlacementsTableId: '<UUID>', databasePlacementsTableName: '<String>', databaseServersTableId: '<UUID>', databaseServersTableName: '<String>', defaultCapabilities: '<String>', entityField: '<String>', partitionInterval: '<String>', physicalDatabasesTableId: '<UUID>', physicalDatabasesTableName: '<String>', policies: '<JSON>', prefix: '<String>', premake: '<Int>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', retention: '<String>', schemaId: '<UUID>', scope: '<String>' }, select: { id: true } }).execute()
db.clusterModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute()
db.clusterModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all clusterModule records

```typescript
const items = await db.clusterModule.findMany({
  select: { id: true, apiName: true }
}).execute();
```

### Create a clusterModule

```typescript
const item = await db.clusterModule.create({
  data: { apiName: '<String>', clusterEventsTableId: '<UUID>', clusterEventsTableName: '<String>', clustersTableId: '<UUID>', clustersTableName: '<String>', databaseId: '<UUID>', databasePlacementsTableId: '<UUID>', databasePlacementsTableName: '<String>', databaseServersTableId: '<UUID>', databaseServersTableName: '<String>', defaultCapabilities: '<String>', entityField: '<String>', partitionInterval: '<String>', physicalDatabasesTableId: '<UUID>', physicalDatabasesTableName: '<String>', policies: '<JSON>', prefix: '<String>', premake: '<Int>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', retention: '<String>', schemaId: '<UUID>', scope: '<String>' },
  select: { id: true }
}).execute();
```
