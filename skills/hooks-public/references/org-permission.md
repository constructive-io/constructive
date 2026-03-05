# orgPermission

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Defines available permissions as named bits within a bitmask, used by the RBAC system for access control

## Usage

```typescript
useOrgPermissionsQuery({ selection: { fields: { id: true, name: true, bitnum: true, bitstr: true, description: true } } })
useOrgPermissionQuery({ id: '<value>', selection: { fields: { id: true, name: true, bitnum: true, bitstr: true, description: true } } })
useCreateOrgPermissionMutation({ selection: { fields: { id: true } } })
useUpdateOrgPermissionMutation({ selection: { fields: { id: true } } })
useDeleteOrgPermissionMutation({})
```

## Examples

### List all orgPermissions

```typescript
const { data, isLoading } = useOrgPermissionsQuery({
  selection: { fields: { id: true, name: true, bitnum: true, bitstr: true, description: true } },
});
```

### Create a orgPermission

```typescript
const { mutate } = useCreateOrgPermissionMutation({
  selection: { fields: { id: true } },
});
mutate({ name: '<value>', bitnum: '<value>', bitstr: '<value>', description: '<value>' });
```
