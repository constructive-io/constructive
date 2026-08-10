# orgCapabilityDefaultGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Audit log of capability additions and removals from the defaults bitmask

## Usage

```typescript
useOrgCapabilityDefaultGrantsQuery({ selection: { fields: { capabilityId: true, createdAt: true, entityId: true, grantorId: true, id: true, isGrant: true, updatedAt: true } } })
useOrgCapabilityDefaultGrantQuery({ id: '<UUID>', selection: { fields: { capabilityId: true, createdAt: true, entityId: true, grantorId: true, id: true, isGrant: true, updatedAt: true } } })
useCreateOrgCapabilityDefaultGrantMutation({ selection: { fields: { id: true } } })
useUpdateOrgCapabilityDefaultGrantMutation({ selection: { fields: { id: true } } })
useDeleteOrgCapabilityDefaultGrantMutation({})
```

## Examples

### List all orgCapabilityDefaultGrants

```typescript
const { data, isLoading } = useOrgCapabilityDefaultGrantsQuery({
  selection: { fields: { capabilityId: true, createdAt: true, entityId: true, grantorId: true, id: true, isGrant: true, updatedAt: true } },
});
```

### Create a orgCapabilityDefaultGrant

```typescript
const { mutate } = useCreateOrgCapabilityDefaultGrantMutation({
  selection: { fields: { id: true } },
});
mutate({ capabilityId: '<UUID>', entityId: '<UUID>', grantorId: '<UUID>', isGrant: '<Boolean>' });
```
