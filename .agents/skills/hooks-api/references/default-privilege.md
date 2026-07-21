# defaultPrivilege

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for DefaultPrivilege data operations

## Usage

```typescript
useDefaultPrivilegesQuery({ selection: { fields: { databaseId: true, granteeName: true, id: true, isGrant: true, objectType: true, privilege: true, schemaId: true } } })
useDefaultPrivilegeQuery({ id: '<UUID>', selection: { fields: { databaseId: true, granteeName: true, id: true, isGrant: true, objectType: true, privilege: true, schemaId: true } } })
useCreateDefaultPrivilegeMutation({ selection: { fields: { id: true } } })
useUpdateDefaultPrivilegeMutation({ selection: { fields: { id: true } } })
useDeleteDefaultPrivilegeMutation({})
```

## Examples

### List all defaultPrivileges

```typescript
const { data, isLoading } = useDefaultPrivilegesQuery({
  selection: { fields: { databaseId: true, granteeName: true, id: true, isGrant: true, objectType: true, privilege: true, schemaId: true } },
});
```

### Create a defaultPrivilege

```typescript
const { mutate } = useCreateDefaultPrivilegeMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', granteeName: '<String>', isGrant: '<Boolean>', objectType: '<String>', privilege: '<String>', schemaId: '<UUID>' });
```
