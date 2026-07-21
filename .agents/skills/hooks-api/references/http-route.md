# httpRoute

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Request-time HTTP routing authority: registered domain plus path prefix and optional method to a typed target

## Usage

```typescript
useHttpRoutesQuery({ selection: { fields: { createdAt: true, createdBy: true, databaseId: true, domainId: true, id: true, isActive: true, method: true, path: true, priority: true, targetId: true, targetKind: true, updatedAt: true, updatedBy: true } } })
useHttpRouteQuery({ id: '<UUID>', selection: { fields: { createdAt: true, createdBy: true, databaseId: true, domainId: true, id: true, isActive: true, method: true, path: true, priority: true, targetId: true, targetKind: true, updatedAt: true, updatedBy: true } } })
useCreateHttpRouteMutation({ selection: { fields: { id: true } } })
useUpdateHttpRouteMutation({ selection: { fields: { id: true } } })
useDeleteHttpRouteMutation({})
```

## Examples

### List all httpRoutes

```typescript
const { data, isLoading } = useHttpRoutesQuery({
  selection: { fields: { createdAt: true, createdBy: true, databaseId: true, domainId: true, id: true, isActive: true, method: true, path: true, priority: true, targetId: true, targetKind: true, updatedAt: true, updatedBy: true } },
});
```

### Create a httpRoute

```typescript
const { mutate } = useCreateHttpRouteMutation({
  selection: { fields: { id: true } },
});
mutate({ createdBy: '<UUID>', databaseId: '<UUID>', domainId: '<UUID>', isActive: '<Boolean>', method: '<String>', path: '<String>', priority: '<Int>', targetId: '<UUID>', targetKind: '<String>', updatedBy: '<UUID>' });
```
