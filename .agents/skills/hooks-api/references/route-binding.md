# routeBinding

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Compiled route precedence index maintained by route sync triggers; carries typed target ids only, read through the resolver

## Usage

```typescript
useRouteBindingsQuery({ selection: { fields: { domainId: true, id: true, isActive: true, method: true, path: true, priority: true, targetApiId: true, targetBucketId: true, targetFunctionId: true, targetRedirectId: true, targetServiceId: true, targetSiteId: true, updatedAt: true } } })
useRouteBindingQuery({ id: '<UUID>', selection: { fields: { domainId: true, id: true, isActive: true, method: true, path: true, priority: true, targetApiId: true, targetBucketId: true, targetFunctionId: true, targetRedirectId: true, targetServiceId: true, targetSiteId: true, updatedAt: true } } })
useCreateRouteBindingMutation({ selection: { fields: { id: true } } })
useUpdateRouteBindingMutation({ selection: { fields: { id: true } } })
useDeleteRouteBindingMutation({})
```

## Examples

### List all routeBindings

```typescript
const { data, isLoading } = useRouteBindingsQuery({
  selection: { fields: { domainId: true, id: true, isActive: true, method: true, path: true, priority: true, targetApiId: true, targetBucketId: true, targetFunctionId: true, targetRedirectId: true, targetServiceId: true, targetSiteId: true, updatedAt: true } },
});
```

### Create a routeBinding

```typescript
const { mutate } = useCreateRouteBindingMutation({
  selection: { fields: { id: true } },
});
mutate({ domainId: '<UUID>', isActive: '<Boolean>', method: '<String>', path: '<String>', priority: '<Int>', targetApiId: '<UUID>', targetBucketId: '<UUID>', targetFunctionId: '<UUID>', targetRedirectId: '<UUID>', targetServiceId: '<UUID>', targetSiteId: '<UUID>' });
```
