# membershipTypesModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for MembershipTypesModule data operations

## Usage

```typescript
useMembershipTypesModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true, tableNameTrgmSimilarity: true, searchScore: true } } })
useMembershipTypesModuleQuery({ id: '<value>', selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true, tableNameTrgmSimilarity: true, searchScore: true } } })
useCreateMembershipTypesModuleMutation({ selection: { fields: { id: true } } })
useUpdateMembershipTypesModuleMutation({ selection: { fields: { id: true } } })
useDeleteMembershipTypesModuleMutation({})
```

## Examples

### List all membershipTypesModules

```typescript
const { data, isLoading } = useMembershipTypesModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true, tableNameTrgmSimilarity: true, searchScore: true } },
});
```

### Create a membershipTypesModule

```typescript
const { mutate } = useCreateMembershipTypesModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<value>', schemaId: '<value>', tableId: '<value>', tableName: '<value>', tableNameTrgmSimilarity: '<value>', searchScore: '<value>' });
```
