# orgPermissionDefaultGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Audit log of permission additions and removals from the defaults bitmask

## Usage

```typescript
useOrgPermissionDefaultGrantsQuery({ selection: { fields: { createdAt: true, entityId: true, grantorId: true, id: true, isGrant: true, permissionId: true, updatedAt: true } } })
useOrgPermissionDefaultGrantQuery({ id: '<UUID>', selection: { fields: { createdAt: true, entityId: true, grantorId: true, id: true, isGrant: true, permissionId: true, updatedAt: true } } })
useCreateOrgPermissionDefaultGrantMutation({ selection: { fields: { id: true } } })
useUpdateOrgPermissionDefaultGrantMutation({ selection: { fields: { id: true } } })
useDeleteOrgPermissionDefaultGrantMutation({})
```

## Examples

### List all orgPermissionDefaultGrants

```typescript
const { data, isLoading } = useOrgPermissionDefaultGrantsQuery({
  selection: { fields: { createdAt: true, entityId: true, grantorId: true, id: true, isGrant: true, permissionId: true, updatedAt: true } },
});
```

### Create a orgPermissionDefaultGrant

```typescript
const { mutate } = useCreateOrgPermissionDefaultGrantMutation({
  selection: { fields: { id: true } },
});
mutate({ entityId: '<UUID>', grantorId: '<UUID>', isGrant: '<Boolean>', permissionId: '<UUID>' });
```
