# orgPermissionDefaultGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Audit log of permission additions and removals from the defaults bitmask

## Usage

```typescript
useOrgPermissionDefaultGrantsQuery({ selection: { fields: { id: true, permissionId: true, isGrant: true, grantorId: true, entityId: true, createdAt: true, updatedAt: true } } })
useOrgPermissionDefaultGrantQuery({ id: '<UUID>', selection: { fields: { id: true, permissionId: true, isGrant: true, grantorId: true, entityId: true, createdAt: true, updatedAt: true } } })
useCreateOrgPermissionDefaultGrantMutation({ selection: { fields: { id: true } } })
useUpdateOrgPermissionDefaultGrantMutation({ selection: { fields: { id: true } } })
useDeleteOrgPermissionDefaultGrantMutation({})
```

## Examples

### List all orgPermissionDefaultGrants

```typescript
const { data, isLoading } = useOrgPermissionDefaultGrantsQuery({
  selection: { fields: { id: true, permissionId: true, isGrant: true, grantorId: true, entityId: true, createdAt: true, updatedAt: true } },
});
```

### Create a orgPermissionDefaultGrant

```typescript
const { mutate } = useCreateOrgPermissionDefaultGrantMutation({
  selection: { fields: { id: true } },
});
mutate({ permissionId: '<UUID>', isGrant: '<Boolean>', grantorId: '<UUID>', entityId: '<UUID>' });
```
