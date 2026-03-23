# membershipTypesModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for MembershipTypesModule data operations

## Usage

```typescript
useMembershipTypesModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true } } })
useMembershipTypesModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true } } })
useCreateMembershipTypesModuleMutation({ selection: { fields: { id: true } } })
useUpdateMembershipTypesModuleMutation({ selection: { fields: { id: true } } })
useDeleteMembershipTypesModuleMutation({})
```

## Examples

### List all membershipTypesModules

```typescript
const { data, isLoading } = useMembershipTypesModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true } },
});
```

### Create a membershipTypesModule

```typescript
const { mutate } = useCreateMembershipTypesModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>' });
```
