# route

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Routes binding a domain hostname and path to a typed catalog target

## Usage

```typescript
useRoutesQuery({ selection: { fields: { config: true, createdAt: true, databaseId: true, domainId: true, id: true, isActive: true, method: true, path: true, previewRef: true, priority: true, servingSiteId: true, targetApiId: true, targetBucketId: true, targetFunctionId: true, targetRedirectId: true, targetServiceId: true, targetSiteId: true, updatedAt: true } } })
useRouteQuery({ id: '<UUID>', selection: { fields: { config: true, createdAt: true, databaseId: true, domainId: true, id: true, isActive: true, method: true, path: true, previewRef: true, priority: true, servingSiteId: true, targetApiId: true, targetBucketId: true, targetFunctionId: true, targetRedirectId: true, targetServiceId: true, targetSiteId: true, updatedAt: true } } })
useCreateRouteMutation({ selection: { fields: { id: true } } })
useUpdateRouteMutation({ selection: { fields: { id: true } } })
useDeleteRouteMutation({})
```

## Examples

### List all routes

```typescript
const { data, isLoading } = useRoutesQuery({
  selection: { fields: { config: true, createdAt: true, databaseId: true, domainId: true, id: true, isActive: true, method: true, path: true, previewRef: true, priority: true, servingSiteId: true, targetApiId: true, targetBucketId: true, targetFunctionId: true, targetRedirectId: true, targetServiceId: true, targetSiteId: true, updatedAt: true } },
});
```

### Create a route

```typescript
const { mutate } = useCreateRouteMutation({
  selection: { fields: { id: true } },
});
mutate({ config: '<JSON>', databaseId: '<UUID>', domainId: '<UUID>', isActive: '<Boolean>', method: '<String>', path: '<String>', previewRef: '<String>', priority: '<Int>', servingSiteId: '<UUID>', targetApiId: '<UUID>', targetBucketId: '<UUID>', targetFunctionId: '<UUID>', targetRedirectId: '<UUID>', targetServiceId: '<UUID>', targetSiteId: '<UUID>' });
```
