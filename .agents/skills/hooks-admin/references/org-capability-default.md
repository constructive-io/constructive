# orgCapabilityDefault

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Stores the default capability bitmask assigned to new members upon joining

## Usage

```typescript
useOrgCapabilityDefaultsQuery({ selection: { fields: { capabilities: true, entityId: true, id: true } } })
useOrgCapabilityDefaultQuery({ id: '<UUID>', selection: { fields: { capabilities: true, entityId: true, id: true } } })
useCreateOrgCapabilityDefaultMutation({ selection: { fields: { id: true } } })
useUpdateOrgCapabilityDefaultMutation({ selection: { fields: { id: true } } })
useDeleteOrgCapabilityDefaultMutation({})
```

## Examples

### List all orgCapabilityDefaults

```typescript
const { data, isLoading } = useOrgCapabilityDefaultsQuery({
  selection: { fields: { capabilities: true, entityId: true, id: true } },
});
```

### Create a orgCapabilityDefault

```typescript
const { mutate } = useCreateOrgCapabilityDefaultMutation({
  selection: { fields: { id: true } },
});
mutate({ capabilities: '<BitString>', entityId: '<UUID>' });
```
