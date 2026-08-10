# orgCapability

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Defines available capabilities as named bits within a bitmask, used by the RBAC system for access control

## Usage

```typescript
useOrgCapabilitiesQuery({ selection: { fields: { bitnum: true, bitstr: true, description: true, id: true, kind: true, name: true } } })
useOrgCapabilityQuery({ id: '<UUID>', selection: { fields: { bitnum: true, bitstr: true, description: true, id: true, kind: true, name: true } } })
useCreateOrgCapabilityMutation({ selection: { fields: { id: true } } })
useUpdateOrgCapabilityMutation({ selection: { fields: { id: true } } })
useDeleteOrgCapabilityMutation({})
```

## Examples

### List all orgCapabilities

```typescript
const { data, isLoading } = useOrgCapabilitiesQuery({
  selection: { fields: { bitnum: true, bitstr: true, description: true, id: true, kind: true, name: true } },
});
```

### Create a orgCapability

```typescript
const { mutate } = useCreateOrgCapabilityMutation({
  selection: { fields: { id: true } },
});
mutate({ bitnum: '<Int>', bitstr: '<BitString>', description: '<String>', kind: '<String>', name: '<String>' });
```
