# userSettingsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for UserSettingsModule data operations

## Usage

```typescript
useUserSettingsModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, ownerTableId: true, tableName: true, apiName: true } } })
useUserSettingsModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, ownerTableId: true, tableName: true, apiName: true } } })
useCreateUserSettingsModuleMutation({ selection: { fields: { id: true } } })
useUpdateUserSettingsModuleMutation({ selection: { fields: { id: true } } })
useDeleteUserSettingsModuleMutation({})
```

## Examples

### List all userSettingsModules

```typescript
const { data, isLoading } = useUserSettingsModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, ownerTableId: true, tableName: true, apiName: true } },
});
```

### Create a userSettingsModule

```typescript
const { mutate } = useCreateUserSettingsModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', ownerTableId: '<UUID>', tableName: '<String>', apiName: '<String>' });
```
