# orgCapabilityDefaultCapability

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Join table linking capability defaults to individual capabilities; recompute trigger rebuilds the defaults bitmask

## Usage

```typescript
useOrgCapabilityDefaultCapabilitiesQuery({ selection: { fields: { capabilityId: true, createdAt: true, entityId: true, id: true, updatedAt: true } } })
useOrgCapabilityDefaultCapabilityQuery({ id: '<UUID>', selection: { fields: { capabilityId: true, createdAt: true, entityId: true, id: true, updatedAt: true } } })
useCreateOrgCapabilityDefaultCapabilityMutation({ selection: { fields: { id: true } } })
useUpdateOrgCapabilityDefaultCapabilityMutation({ selection: { fields: { id: true } } })
useDeleteOrgCapabilityDefaultCapabilityMutation({})
```

## Examples

### List all orgCapabilityDefaultCapabilities

```typescript
const { data, isLoading } = useOrgCapabilityDefaultCapabilitiesQuery({
  selection: { fields: { capabilityId: true, createdAt: true, entityId: true, id: true, updatedAt: true } },
});
```

### Create a orgCapabilityDefaultCapability

```typescript
const { mutate } = useCreateOrgCapabilityDefaultCapabilityMutation({
  selection: { fields: { id: true } },
});
mutate({ capabilityId: '<UUID>', entityId: '<UUID>' });
```
