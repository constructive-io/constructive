# realtimeModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for RealtimeModule data operations

## Usage

```typescript
useRealtimeModulesQuery({ selection: { fields: { apiName: true, changeLogTableId: true, databaseId: true, id: true, interval: true, listenerNodeTableId: true, notifyChannel: true, premake: true, privateApiName: true, privateSchemaId: true, retentionHours: true, schemaId: true, sourceRegistryTableId: true, subscriptionsSchemaId: true } } })
useRealtimeModuleQuery({ id: '<UUID>', selection: { fields: { apiName: true, changeLogTableId: true, databaseId: true, id: true, interval: true, listenerNodeTableId: true, notifyChannel: true, premake: true, privateApiName: true, privateSchemaId: true, retentionHours: true, schemaId: true, sourceRegistryTableId: true, subscriptionsSchemaId: true } } })
useCreateRealtimeModuleMutation({ selection: { fields: { id: true } } })
useUpdateRealtimeModuleMutation({ selection: { fields: { id: true } } })
useDeleteRealtimeModuleMutation({})
```

## Examples

### List all realtimeModules

```typescript
const { data, isLoading } = useRealtimeModulesQuery({
  selection: { fields: { apiName: true, changeLogTableId: true, databaseId: true, id: true, interval: true, listenerNodeTableId: true, notifyChannel: true, premake: true, privateApiName: true, privateSchemaId: true, retentionHours: true, schemaId: true, sourceRegistryTableId: true, subscriptionsSchemaId: true } },
});
```

### Create a realtimeModule

```typescript
const { mutate } = useCreateRealtimeModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ apiName: '<String>', changeLogTableId: '<UUID>', databaseId: '<UUID>', interval: '<String>', listenerNodeTableId: '<UUID>', notifyChannel: '<String>', premake: '<Int>', privateApiName: '<String>', privateSchemaId: '<UUID>', retentionHours: '<Int>', schemaId: '<UUID>', sourceRegistryTableId: '<UUID>', subscriptionsSchemaId: '<UUID>' });
```
