# orgPermission

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Defines available permissions as named bits within a bitmask, used by the RBAC system for access control

## Usage

```typescript
useOrgPermissionsQuery({ selection: { fields: { bitnum: true, bitstr: true, description: true, id: true, name: true } } })
useOrgPermissionQuery({ id: '<UUID>', selection: { fields: { bitnum: true, bitstr: true, description: true, id: true, name: true } } })
useCreateOrgPermissionMutation({ selection: { fields: { id: true } } })
useUpdateOrgPermissionMutation({ selection: { fields: { id: true } } })
useDeleteOrgPermissionMutation({})
```

## Examples

### List all orgPermissions

```typescript
const { data, isLoading } = useOrgPermissionsQuery({
  selection: { fields: { bitnum: true, bitstr: true, description: true, id: true, name: true } },
});
```

### Create a orgPermission

```typescript
const { mutate } = useCreateOrgPermissionMutation({
  selection: { fields: { id: true } },
});
mutate({ bitnum: '<Int>', bitstr: '<BitString>', description: '<String>', name: '<String>' });
```
