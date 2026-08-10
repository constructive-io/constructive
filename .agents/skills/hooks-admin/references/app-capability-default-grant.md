# appCapabilityDefaultGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Audit log of capability additions and removals from the defaults bitmask

## Usage

```typescript
useAppCapabilityDefaultGrantsQuery({ selection: { fields: { capabilityId: true, createdAt: true, grantorId: true, id: true, isGrant: true, updatedAt: true } } })
useAppCapabilityDefaultGrantQuery({ id: '<UUID>', selection: { fields: { capabilityId: true, createdAt: true, grantorId: true, id: true, isGrant: true, updatedAt: true } } })
useCreateAppCapabilityDefaultGrantMutation({ selection: { fields: { id: true } } })
useUpdateAppCapabilityDefaultGrantMutation({ selection: { fields: { id: true } } })
useDeleteAppCapabilityDefaultGrantMutation({})
```

## Examples

### List all appCapabilityDefaultGrants

```typescript
const { data, isLoading } = useAppCapabilityDefaultGrantsQuery({
  selection: { fields: { capabilityId: true, createdAt: true, grantorId: true, id: true, isGrant: true, updatedAt: true } },
});
```

### Create a appCapabilityDefaultGrant

```typescript
const { mutate } = useCreateAppCapabilityDefaultGrantMutation({
  selection: { fields: { id: true } },
});
mutate({ capabilityId: '<UUID>', grantorId: '<UUID>', isGrant: '<Boolean>' });
```
