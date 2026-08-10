# appCapability

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Defines available capabilities as named bits within a bitmask, used by the RBAC system for access control

## Usage

```typescript
useAppCapabilitiesQuery({ selection: { fields: { bitnum: true, bitstr: true, description: true, id: true, kind: true, name: true } } })
useAppCapabilityQuery({ id: '<UUID>', selection: { fields: { bitnum: true, bitstr: true, description: true, id: true, kind: true, name: true } } })
useCreateAppCapabilityMutation({ selection: { fields: { id: true } } })
useUpdateAppCapabilityMutation({ selection: { fields: { id: true } } })
useDeleteAppCapabilityMutation({})
```

## Examples

### List all appCapabilities

```typescript
const { data, isLoading } = useAppCapabilitiesQuery({
  selection: { fields: { bitnum: true, bitstr: true, description: true, id: true, kind: true, name: true } },
});
```

### Create a appCapability

```typescript
const { mutate } = useCreateAppCapabilityMutation({
  selection: { fields: { id: true } },
});
mutate({ bitnum: '<Int>', bitstr: '<BitString>', description: '<String>', kind: '<String>', name: '<String>' });
```
