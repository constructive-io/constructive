# permissionsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for PermissionsModule data operations

## Usage

```typescript
usePermissionsModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, tableName: true, defaultTableId: true, defaultTableName: true, bitlen: true, membershipType: true, entityTableId: true, actorTableId: true, prefix: true, getPaddedMask: true, getMask: true, getByMask: true, getMaskByName: true } } })
usePermissionsModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, tableName: true, defaultTableId: true, defaultTableName: true, bitlen: true, membershipType: true, entityTableId: true, actorTableId: true, prefix: true, getPaddedMask: true, getMask: true, getByMask: true, getMaskByName: true } } })
useCreatePermissionsModuleMutation({ selection: { fields: { id: true } } })
useUpdatePermissionsModuleMutation({ selection: { fields: { id: true } } })
useDeletePermissionsModuleMutation({})
```

## Examples

### List all permissionsModules

```typescript
const { data, isLoading } = usePermissionsModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, tableName: true, defaultTableId: true, defaultTableName: true, bitlen: true, membershipType: true, entityTableId: true, actorTableId: true, prefix: true, getPaddedMask: true, getMask: true, getByMask: true, getMaskByName: true } },
});
```

### Create a permissionsModule

```typescript
const { mutate } = useCreatePermissionsModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>', defaultTableId: '<UUID>', defaultTableName: '<String>', bitlen: '<Int>', membershipType: '<Int>', entityTableId: '<UUID>', actorTableId: '<UUID>', prefix: '<String>', getPaddedMask: '<String>', getMask: '<String>', getByMask: '<String>', getMaskByName: '<String>' });
```
