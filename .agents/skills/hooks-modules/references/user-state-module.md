# userStateModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for UserStateModule data operations

## Usage

```typescript
useUserStateModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true } } })
useUserStateModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true } } })
useCreateUserStateModuleMutation({ selection: { fields: { id: true } } })
useUpdateUserStateModuleMutation({ selection: { fields: { id: true } } })
useDeleteUserStateModuleMutation({})
```

## Examples

### List all userStateModules

```typescript
const { data, isLoading } = useUserStateModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true } },
});
```

### Create a userStateModule

```typescript
const { mutate } = useCreateUserStateModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>' });
```
