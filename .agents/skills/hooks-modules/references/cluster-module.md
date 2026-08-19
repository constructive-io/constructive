# clusterModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for ClusterModule data operations

## Usage

```typescript
useClusterModulesQuery({ selection: { fields: { apiName: true, clusterEventsTableId: true, clusterEventsTableName: true, clustersTableId: true, clustersTableName: true, databaseId: true, databasePlacementsTableId: true, databasePlacementsTableName: true, databaseServersTableId: true, databaseServersTableName: true, defaultCapabilities: true, entityField: true, id: true, partitionInterval: true, physicalDatabasesTableId: true, physicalDatabasesTableName: true, policies: true, prefix: true, premake: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, retention: true, schemaId: true, scope: true } } })
useClusterModuleQuery({ id: '<UUID>', selection: { fields: { apiName: true, clusterEventsTableId: true, clusterEventsTableName: true, clustersTableId: true, clustersTableName: true, databaseId: true, databasePlacementsTableId: true, databasePlacementsTableName: true, databaseServersTableId: true, databaseServersTableName: true, defaultCapabilities: true, entityField: true, id: true, partitionInterval: true, physicalDatabasesTableId: true, physicalDatabasesTableName: true, policies: true, prefix: true, premake: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, retention: true, schemaId: true, scope: true } } })
useCreateClusterModuleMutation({ selection: { fields: { id: true } } })
useUpdateClusterModuleMutation({ selection: { fields: { id: true } } })
useDeleteClusterModuleMutation({})
```

## Examples

### List all clusterModules

```typescript
const { data, isLoading } = useClusterModulesQuery({
  selection: { fields: { apiName: true, clusterEventsTableId: true, clusterEventsTableName: true, clustersTableId: true, clustersTableName: true, databaseId: true, databasePlacementsTableId: true, databasePlacementsTableName: true, databaseServersTableId: true, databaseServersTableName: true, defaultCapabilities: true, entityField: true, id: true, partitionInterval: true, physicalDatabasesTableId: true, physicalDatabasesTableName: true, policies: true, prefix: true, premake: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, retention: true, schemaId: true, scope: true } },
});
```

### Create a clusterModule

```typescript
const { mutate } = useCreateClusterModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ apiName: '<String>', clusterEventsTableId: '<UUID>', clusterEventsTableName: '<String>', clustersTableId: '<UUID>', clustersTableName: '<String>', databaseId: '<UUID>', databasePlacementsTableId: '<UUID>', databasePlacementsTableName: '<String>', databaseServersTableId: '<UUID>', databaseServersTableName: '<String>', defaultCapabilities: '<String>', entityField: '<String>', partitionInterval: '<String>', physicalDatabasesTableId: '<UUID>', physicalDatabasesTableName: '<String>', policies: '<JSON>', prefix: '<String>', premake: '<Int>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', retention: '<String>', schemaId: '<UUID>', scope: '<String>' });
```
