# userSettingsSecurityModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for UserSettingsSecurityModule data operations

## Usage

```typescript
useUserSettingsSecurityModulesQuery({ selection: { fields: { apiName: true, databaseId: true, id: true, ownerTableId: true, schemaId: true, tableId: true, tableName: true } } })
useUserSettingsSecurityModuleQuery({ id: '<UUID>', selection: { fields: { apiName: true, databaseId: true, id: true, ownerTableId: true, schemaId: true, tableId: true, tableName: true } } })
useCreateUserSettingsSecurityModuleMutation({ selection: { fields: { id: true } } })
useUpdateUserSettingsSecurityModuleMutation({ selection: { fields: { id: true } } })
useDeleteUserSettingsSecurityModuleMutation({})
```

## Examples

### List all userSettingsSecurityModules

```typescript
const { data, isLoading } = useUserSettingsSecurityModulesQuery({
  selection: { fields: { apiName: true, databaseId: true, id: true, ownerTableId: true, schemaId: true, tableId: true, tableName: true } },
});
```

### Create a userSettingsSecurityModule

```typescript
const { mutate } = useCreateUserSettingsSecurityModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ apiName: '<String>', databaseId: '<UUID>', ownerTableId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>' });
```
