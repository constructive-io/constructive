# orgProfileCapability

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Join table linking profiles to individual capabilities they include

## Usage

```typescript
useOrgProfileCapabilitiesQuery({ selection: { fields: { capabilityId: true, createdAt: true, id: true, profileId: true, updatedAt: true } } })
useOrgProfileCapabilityQuery({ id: '<UUID>', selection: { fields: { capabilityId: true, createdAt: true, id: true, profileId: true, updatedAt: true } } })
useCreateOrgProfileCapabilityMutation({ selection: { fields: { id: true } } })
useUpdateOrgProfileCapabilityMutation({ selection: { fields: { id: true } } })
useDeleteOrgProfileCapabilityMutation({})
```

## Examples

### List all orgProfileCapabilities

```typescript
const { data, isLoading } = useOrgProfileCapabilitiesQuery({
  selection: { fields: { capabilityId: true, createdAt: true, id: true, profileId: true, updatedAt: true } },
});
```

### Create a orgProfileCapability

```typescript
const { mutate } = useCreateOrgProfileCapabilityMutation({
  selection: { fields: { id: true } },
});
mutate({ capabilityId: '<UUID>', profileId: '<UUID>' });
```
