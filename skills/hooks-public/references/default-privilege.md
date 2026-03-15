# defaultPrivilege

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for DefaultPrivilege data operations

## Usage

```typescript
useDefaultPrivilegesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, objectType: true, privilege: true, granteeName: true, isGrant: true, objectTypeTrgmSimilarity: true, privilegeTrgmSimilarity: true, granteeNameTrgmSimilarity: true, searchScore: true } } })
useDefaultPrivilegeQuery({ id: '<value>', selection: { fields: { id: true, databaseId: true, schemaId: true, objectType: true, privilege: true, granteeName: true, isGrant: true, objectTypeTrgmSimilarity: true, privilegeTrgmSimilarity: true, granteeNameTrgmSimilarity: true, searchScore: true } } })
useCreateDefaultPrivilegeMutation({ selection: { fields: { id: true } } })
useUpdateDefaultPrivilegeMutation({ selection: { fields: { id: true } } })
useDeleteDefaultPrivilegeMutation({})
```

## Examples

### List all defaultPrivileges

```typescript
const { data, isLoading } = useDefaultPrivilegesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, objectType: true, privilege: true, granteeName: true, isGrant: true, objectTypeTrgmSimilarity: true, privilegeTrgmSimilarity: true, granteeNameTrgmSimilarity: true, searchScore: true } },
});
```

### Create a defaultPrivilege

```typescript
const { mutate } = useCreateDefaultPrivilegeMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<value>', schemaId: '<value>', objectType: '<value>', privilege: '<value>', granteeName: '<value>', isGrant: '<value>', objectTypeTrgmSimilarity: '<value>', privilegeTrgmSimilarity: '<value>', granteeNameTrgmSimilarity: '<value>', searchScore: '<value>' });
```
