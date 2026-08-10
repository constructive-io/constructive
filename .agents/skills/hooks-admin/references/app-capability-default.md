# appCapabilityDefault

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Stores the default capability bitmask assigned to new members upon joining

## Usage

```typescript
useAppCapabilityDefaultsQuery({ selection: { fields: { capabilities: true, id: true } } })
useAppCapabilityDefaultQuery({ id: '<UUID>', selection: { fields: { capabilities: true, id: true } } })
useCreateAppCapabilityDefaultMutation({ selection: { fields: { id: true } } })
useUpdateAppCapabilityDefaultMutation({ selection: { fields: { id: true } } })
useDeleteAppCapabilityDefaultMutation({})
```

## Examples

### List all appCapabilityDefaults

```typescript
const { data, isLoading } = useAppCapabilityDefaultsQuery({
  selection: { fields: { capabilities: true, id: true } },
});
```

### Create a appCapabilityDefault

```typescript
const { mutate } = useCreateAppCapabilityDefaultMutation({
  selection: { fields: { id: true } },
});
mutate({ capabilities: '<BitString>' });
```
