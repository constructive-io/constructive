# capabilitiesModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for CapabilitiesModule data operations

## Usage

```typescript
useCapabilitiesModulesQuery({ selection: { fields: { actorTableId: true, apiName: true, bitlen: true, databaseId: true, defaultTableId: true, defaultTableName: true, entityField: true, entityTableId: true, getByMask: true, getMask: true, getMaskByName: true, getPaddedMask: true, id: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, schemaId: true, scope: true, tableId: true, tableName: true } } })
useCapabilitiesModuleQuery({ id: '<UUID>', selection: { fields: { actorTableId: true, apiName: true, bitlen: true, databaseId: true, defaultTableId: true, defaultTableName: true, entityField: true, entityTableId: true, getByMask: true, getMask: true, getMaskByName: true, getPaddedMask: true, id: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, schemaId: true, scope: true, tableId: true, tableName: true } } })
useCreateCapabilitiesModuleMutation({ selection: { fields: { id: true } } })
useUpdateCapabilitiesModuleMutation({ selection: { fields: { id: true } } })
useDeleteCapabilitiesModuleMutation({})
```

## Examples

### List all capabilitiesModules

```typescript
const { data, isLoading } = useCapabilitiesModulesQuery({
  selection: { fields: { actorTableId: true, apiName: true, bitlen: true, databaseId: true, defaultTableId: true, defaultTableName: true, entityField: true, entityTableId: true, getByMask: true, getMask: true, getMaskByName: true, getPaddedMask: true, id: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, schemaId: true, scope: true, tableId: true, tableName: true } },
});
```

### Create a capabilitiesModule

```typescript
const { mutate } = useCreateCapabilitiesModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ actorTableId: '<UUID>', apiName: '<String>', bitlen: '<Int>', databaseId: '<UUID>', defaultTableId: '<UUID>', defaultTableName: '<String>', entityField: '<String>', entityTableId: '<UUID>', getByMask: '<String>', getMask: '<String>', getMaskByName: '<String>', getPaddedMask: '<String>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>', tableId: '<UUID>', tableName: '<String>' });
```
