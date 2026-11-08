# platformReservedSubdomain

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Subdomain labels no tenant may claim under a platform apex

## Usage

```typescript
usePlatformReservedSubdomainsQuery({ selection: { fields: { createdAt: true, createdByPrincipal: true, id: true, label: true, match: true, reason: true, updatedAt: true, updatedByPrincipal: true } } })
usePlatformReservedSubdomainQuery({ id: '<UUID>', selection: { fields: { createdAt: true, createdByPrincipal: true, id: true, label: true, match: true, reason: true, updatedAt: true, updatedByPrincipal: true } } })
useCreatePlatformReservedSubdomainMutation({ selection: { fields: { id: true } } })
useUpdatePlatformReservedSubdomainMutation({ selection: { fields: { id: true } } })
useDeletePlatformReservedSubdomainMutation({})
```

## Examples

### List all platformReservedSubdomains

```typescript
const { data, isLoading } = usePlatformReservedSubdomainsQuery({
  selection: { fields: { createdAt: true, createdByPrincipal: true, id: true, label: true, match: true, reason: true, updatedAt: true, updatedByPrincipal: true } },
});
```

### Create a platformReservedSubdomain

```typescript
const { mutate } = useCreatePlatformReservedSubdomainMutation({
  selection: { fields: { id: true } },
});
mutate({ createdByPrincipal: '<UUID>', label: '<String>', match: '<String>', reason: '<String>', updatedByPrincipal: '<UUID>' });
```
