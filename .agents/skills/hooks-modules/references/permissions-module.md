# permissionsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for PermissionsModule data operations

## Usage

```typescript
usePermissionsModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, tableId: true, tableName: true, defaultTableId: true, defaultTableName: true, bitlen: true, scope: true, prefix: true, entityTableId: true, actorTableId: true, getPaddedMask: true, getMask: true, getByMask: true, getMaskByName: true, apiName: true, privateApiName: true } } })
usePermissionsModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, tableId: true, tableName: true, defaultTableId: true, defaultTableName: true, bitlen: true, scope: true, prefix: true, entityTableId: true, actorTableId: true, getPaddedMask: true, getMask: true, getByMask: true, getMaskByName: true, apiName: true, privateApiName: true } } })
useCreatePermissionsModuleMutation({ selection: { fields: { id: true } } })
useUpdatePermissionsModuleMutation({ selection: { fields: { id: true } } })
useDeletePermissionsModuleMutation({})
```

## Examples

### List all permissionsModules

```typescript
const { data, isLoading } = usePermissionsModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, tableId: true, tableName: true, defaultTableId: true, defaultTableName: true, bitlen: true, scope: true, prefix: true, entityTableId: true, actorTableId: true, getPaddedMask: true, getMask: true, getByMask: true, getMaskByName: true, apiName: true, privateApiName: true } },
});
```

### Create a permissionsModule

```typescript
const { mutate } = useCreatePermissionsModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', tableId: '<UUID>', tableName: '<String>', defaultTableId: '<UUID>', defaultTableName: '<String>', bitlen: '<Int>', scope: '<String>', prefix: '<String>', entityTableId: '<UUID>', actorTableId: '<UUID>', getPaddedMask: '<String>', getMask: '<String>', getByMask: '<String>', getMaskByName: '<String>', apiName: '<String>', privateApiName: '<String>' });
```
