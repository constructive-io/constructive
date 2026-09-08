# machineModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for MachineModule data operations

## Usage

```typescript
useMachineModulesQuery({ selection: { fields: { apiName: true, databaseId: true, defaultCapabilities: true, entityField: true, entityTableId: true, id: true, machineMessagesTableId: true, machineMessagesTableName: true, machineSessionsTableId: true, machineSessionsTableName: true, machinesTableId: true, machinesTableName: true, partitionInterval: true, policies: true, prefix: true, premake: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, retention: true, schemaId: true, scope: true } } })
useMachineModuleQuery({ id: '<UUID>', selection: { fields: { apiName: true, databaseId: true, defaultCapabilities: true, entityField: true, entityTableId: true, id: true, machineMessagesTableId: true, machineMessagesTableName: true, machineSessionsTableId: true, machineSessionsTableName: true, machinesTableId: true, machinesTableName: true, partitionInterval: true, policies: true, prefix: true, premake: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, retention: true, schemaId: true, scope: true } } })
useCreateMachineModuleMutation({ selection: { fields: { id: true } } })
useUpdateMachineModuleMutation({ selection: { fields: { id: true } } })
useDeleteMachineModuleMutation({})
```

## Examples

### List all machineModules

```typescript
const { data, isLoading } = useMachineModulesQuery({
  selection: { fields: { apiName: true, databaseId: true, defaultCapabilities: true, entityField: true, entityTableId: true, id: true, machineMessagesTableId: true, machineMessagesTableName: true, machineSessionsTableId: true, machineSessionsTableName: true, machinesTableId: true, machinesTableName: true, partitionInterval: true, policies: true, prefix: true, premake: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, retention: true, schemaId: true, scope: true } },
});
```

### Create a machineModule

```typescript
const { mutate } = useCreateMachineModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ apiName: '<String>', databaseId: '<UUID>', defaultCapabilities: '<String>', entityField: '<String>', entityTableId: '<UUID>', machineMessagesTableId: '<UUID>', machineMessagesTableName: '<String>', machineSessionsTableId: '<UUID>', machineSessionsTableName: '<String>', machinesTableId: '<UUID>', machinesTableName: '<String>', partitionInterval: '<String>', policies: '<JSON>', prefix: '<String>', premake: '<Int>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', retention: '<String>', schemaId: '<UUID>', scope: '<String>' });
```
