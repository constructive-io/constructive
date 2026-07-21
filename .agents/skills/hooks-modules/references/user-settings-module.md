# userSettingsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for UserSettingsModule data operations

## Usage

```typescript
useUserSettingsModulesQuery({ selection: { fields: { apiName: true, databaseId: true, id: true, ownerTableId: true, schemaId: true, tableId: true, tableName: true } } })
useUserSettingsModuleQuery({ id: '<UUID>', selection: { fields: { apiName: true, databaseId: true, id: true, ownerTableId: true, schemaId: true, tableId: true, tableName: true } } })
useCreateUserSettingsModuleMutation({ selection: { fields: { id: true } } })
useUpdateUserSettingsModuleMutation({ selection: { fields: { id: true } } })
useDeleteUserSettingsModuleMutation({})
```

## Examples

### List all userSettingsModules

```typescript
const { data, isLoading } = useUserSettingsModulesQuery({
  selection: { fields: { apiName: true, databaseId: true, id: true, ownerTableId: true, schemaId: true, tableId: true, tableName: true } },
});
```

### Create a userSettingsModule

```typescript
const { mutate } = useCreateUserSettingsModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ apiName: '<String>', databaseId: '<UUID>', ownerTableId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>' });
```
