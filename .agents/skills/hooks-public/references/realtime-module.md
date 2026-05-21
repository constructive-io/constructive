# realtimeModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for RealtimeModule data operations

## Usage

```typescript
useRealtimeModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, subscriptionsSchemaId: true, changeLogTableId: true, listenerNodeTableId: true, sourceRegistryTableId: true, retentionHours: true, premake: true, interval: true, notifyChannel: true } } })
useRealtimeModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, subscriptionsSchemaId: true, changeLogTableId: true, listenerNodeTableId: true, sourceRegistryTableId: true, retentionHours: true, premake: true, interval: true, notifyChannel: true } } })
useCreateRealtimeModuleMutation({ selection: { fields: { id: true } } })
useUpdateRealtimeModuleMutation({ selection: { fields: { id: true } } })
useDeleteRealtimeModuleMutation({})
```

## Examples

### List all realtimeModules

```typescript
const { data, isLoading } = useRealtimeModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, subscriptionsSchemaId: true, changeLogTableId: true, listenerNodeTableId: true, sourceRegistryTableId: true, retentionHours: true, premake: true, interval: true, notifyChannel: true } },
});
```

### Create a realtimeModule

```typescript
const { mutate } = useCreateRealtimeModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', subscriptionsSchemaId: '<UUID>', changeLogTableId: '<UUID>', listenerNodeTableId: '<UUID>', sourceRegistryTableId: '<UUID>', retentionHours: '<Int>', premake: '<Int>', interval: '<String>', notifyChannel: '<String>' });
```
