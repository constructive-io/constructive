# permissionsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for PermissionsModule data operations

## Usage

```typescript
usePermissionsModulesQuery({ selection: { fields: { actorTableId: true, apiName: true, bitlen: true, databaseId: true, defaultTableId: true, defaultTableName: true, entityField: true, entityTableId: true, getByMask: true, getMask: true, getMaskByName: true, getPaddedMask: true, id: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, schemaId: true, scope: true, tableId: true, tableName: true } } })
usePermissionsModuleQuery({ id: '<UUID>', selection: { fields: { actorTableId: true, apiName: true, bitlen: true, databaseId: true, defaultTableId: true, defaultTableName: true, entityField: true, entityTableId: true, getByMask: true, getMask: true, getMaskByName: true, getPaddedMask: true, id: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, schemaId: true, scope: true, tableId: true, tableName: true } } })
useCreatePermissionsModuleMutation({ selection: { fields: { id: true } } })
useUpdatePermissionsModuleMutation({ selection: { fields: { id: true } } })
useDeletePermissionsModuleMutation({})
```

## Examples

### List all permissionsModules

```typescript
const { data, isLoading } = usePermissionsModulesQuery({
  selection: { fields: { actorTableId: true, apiName: true, bitlen: true, databaseId: true, defaultTableId: true, defaultTableName: true, entityField: true, entityTableId: true, getByMask: true, getMask: true, getMaskByName: true, getPaddedMask: true, id: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, schemaId: true, scope: true, tableId: true, tableName: true } },
});
```

### Create a permissionsModule

```typescript
const { mutate } = useCreatePermissionsModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ actorTableId: '<UUID>', apiName: '<String>', bitlen: '<Int>', databaseId: '<UUID>', defaultTableId: '<UUID>', defaultTableName: '<String>', entityField: '<String>', entityTableId: '<UUID>', getByMask: '<String>', getMask: '<String>', getMaskByName: '<String>', getPaddedMask: '<String>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>', tableId: '<UUID>', tableName: '<String>' });
```
