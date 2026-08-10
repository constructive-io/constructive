# appProfileCapability

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Join table linking profiles to individual capabilities they include

## Usage

```typescript
useAppProfileCapabilitiesQuery({ selection: { fields: { capabilityId: true, createdAt: true, id: true, profileId: true, updatedAt: true } } })
useAppProfileCapabilityQuery({ id: '<UUID>', selection: { fields: { capabilityId: true, createdAt: true, id: true, profileId: true, updatedAt: true } } })
useCreateAppProfileCapabilityMutation({ selection: { fields: { id: true } } })
useUpdateAppProfileCapabilityMutation({ selection: { fields: { id: true } } })
useDeleteAppProfileCapabilityMutation({})
```

## Examples

### List all appProfileCapabilities

```typescript
const { data, isLoading } = useAppProfileCapabilitiesQuery({
  selection: { fields: { capabilityId: true, createdAt: true, id: true, profileId: true, updatedAt: true } },
});
```

### Create a appProfileCapability

```typescript
const { mutate } = useCreateAppProfileCapabilityMutation({
  selection: { fields: { id: true } },
});
mutate({ capabilityId: '<UUID>', profileId: '<UUID>' });
```
