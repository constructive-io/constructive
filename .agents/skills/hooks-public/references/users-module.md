# usersModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for UsersModule data operations

## Usage

```typescript
useUsersModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true, typeTableId: true, typeTableName: true } } })
useUsersModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true, typeTableId: true, typeTableName: true } } })
useCreateUsersModuleMutation({ selection: { fields: { id: true } } })
useUpdateUsersModuleMutation({ selection: { fields: { id: true } } })
useDeleteUsersModuleMutation({})
```

## Examples

### List all usersModules

```typescript
const { data, isLoading } = useUsersModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true, typeTableId: true, typeTableName: true } },
});
```

### Create a usersModule

```typescript
const { mutate } = useCreateUsersModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>', typeTableId: '<UUID>', typeTableName: '<String>' });
```
