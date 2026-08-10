# appProfileGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Audit log of profile assignments and revocations for members

## Usage

```typescript
useAppProfileGrantsQuery({ selection: { fields: { createdAt: true, grantorId: true, id: true, isGrant: true, membershipId: true, profileId: true, updatedAt: true } } })
useAppProfileGrantQuery({ id: '<UUID>', selection: { fields: { createdAt: true, grantorId: true, id: true, isGrant: true, membershipId: true, profileId: true, updatedAt: true } } })
useCreateAppProfileGrantMutation({ selection: { fields: { id: true } } })
useUpdateAppProfileGrantMutation({ selection: { fields: { id: true } } })
useDeleteAppProfileGrantMutation({})
```

## Examples

### List all appProfileGrants

```typescript
const { data, isLoading } = useAppProfileGrantsQuery({
  selection: { fields: { createdAt: true, grantorId: true, id: true, isGrant: true, membershipId: true, profileId: true, updatedAt: true } },
});
```

### Create a appProfileGrant

```typescript
const { mutate } = useCreateAppProfileGrantMutation({
  selection: { fields: { id: true } },
});
mutate({ grantorId: '<UUID>', isGrant: '<Boolean>', membershipId: '<UUID>', profileId: '<UUID>' });
```
