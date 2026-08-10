# appCapabilityDefaultCapability

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Join table linking capability defaults to individual capabilities; recompute trigger rebuilds the defaults bitmask

## Usage

```typescript
useAppCapabilityDefaultCapabilitiesQuery({ selection: { fields: { capabilityId: true, createdAt: true, id: true, updatedAt: true } } })
useAppCapabilityDefaultCapabilityQuery({ id: '<UUID>', selection: { fields: { capabilityId: true, createdAt: true, id: true, updatedAt: true } } })
useCreateAppCapabilityDefaultCapabilityMutation({ selection: { fields: { id: true } } })
useUpdateAppCapabilityDefaultCapabilityMutation({ selection: { fields: { id: true } } })
useDeleteAppCapabilityDefaultCapabilityMutation({})
```

## Examples

### List all appCapabilityDefaultCapabilities

```typescript
const { data, isLoading } = useAppCapabilityDefaultCapabilitiesQuery({
  selection: { fields: { capabilityId: true, createdAt: true, id: true, updatedAt: true } },
});
```

### Create a appCapabilityDefaultCapability

```typescript
const { mutate } = useCreateAppCapabilityDefaultCapabilityMutation({
  selection: { fields: { id: true } },
});
mutate({ capabilityId: '<UUID>' });
```
