# defaultPrivilege

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for DefaultPrivilege data operations

## Usage

```typescript
useDefaultPrivilegesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, objectType: true, privilege: true, granteeName: true, isGrant: true } } })
useDefaultPrivilegeQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, schemaId: true, objectType: true, privilege: true, granteeName: true, isGrant: true } } })
useCreateDefaultPrivilegeMutation({ selection: { fields: { id: true } } })
useUpdateDefaultPrivilegeMutation({ selection: { fields: { id: true } } })
useDeleteDefaultPrivilegeMutation({})
```

## Examples

### List all defaultPrivileges

```typescript
const { data, isLoading } = useDefaultPrivilegesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, objectType: true, privilege: true, granteeName: true, isGrant: true } },
});
```

### Create a defaultPrivilege

```typescript
const { mutate } = useCreateDefaultPrivilegeMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', schemaId: '<UUID>', objectType: '<String>', privilege: '<String>', granteeName: '<String>', isGrant: '<Boolean>' });
```
