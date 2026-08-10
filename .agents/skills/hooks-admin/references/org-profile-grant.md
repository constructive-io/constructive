# orgProfileGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Audit log of profile assignments and revocations for members

## Usage

```typescript
useOrgProfileGrantsQuery({ selection: { fields: { createdAt: true, entityId: true, grantorId: true, id: true, isGrant: true, membershipId: true, profileId: true, updatedAt: true } } })
useOrgProfileGrantQuery({ id: '<UUID>', selection: { fields: { createdAt: true, entityId: true, grantorId: true, id: true, isGrant: true, membershipId: true, profileId: true, updatedAt: true } } })
useCreateOrgProfileGrantMutation({ selection: { fields: { id: true } } })
useUpdateOrgProfileGrantMutation({ selection: { fields: { id: true } } })
useDeleteOrgProfileGrantMutation({})
```

## Examples

### List all orgProfileGrants

```typescript
const { data, isLoading } = useOrgProfileGrantsQuery({
  selection: { fields: { createdAt: true, entityId: true, grantorId: true, id: true, isGrant: true, membershipId: true, profileId: true, updatedAt: true } },
});
```

### Create a orgProfileGrant

```typescript
const { mutate } = useCreateOrgProfileGrantMutation({
  selection: { fields: { id: true } },
});
mutate({ entityId: '<UUID>', grantorId: '<UUID>', isGrant: '<Boolean>', membershipId: '<UUID>', profileId: '<UUID>' });
```
