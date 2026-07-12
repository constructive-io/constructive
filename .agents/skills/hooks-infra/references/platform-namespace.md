# platformNamespace

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Logical namespace containers for grouping secrets, config, functions, and other resources

## Usage

```typescript
usePlatformNamespacesQuery({ selection: { fields: { id: true, createdAt: true, updatedAt: true, name: true, namespaceName: true, description: true, isActive: true, status: true, lastError: true, labels: true, annotations: true, isManaged: true } } })
usePlatformNamespaceQuery({ id: '<UUID>', selection: { fields: { id: true, createdAt: true, updatedAt: true, name: true, namespaceName: true, description: true, isActive: true, status: true, lastError: true, labels: true, annotations: true, isManaged: true } } })
useCreatePlatformNamespaceMutation({ selection: { fields: { id: true } } })
useUpdatePlatformNamespaceMutation({ selection: { fields: { id: true } } })
useDeletePlatformNamespaceMutation({})
```

## Examples

### List all platformNamespaces

```typescript
const { data, isLoading } = usePlatformNamespacesQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, name: true, namespaceName: true, description: true, isActive: true, status: true, lastError: true, labels: true, annotations: true, isManaged: true } },
});
```

### Create a platformNamespace

```typescript
const { mutate } = useCreatePlatformNamespaceMutation({
  selection: { fields: { id: true } },
});
mutate({ name: '<String>', namespaceName: '<String>', description: '<String>', isActive: '<Boolean>', status: '<String>', lastError: '<String>', labels: '<JSON>', annotations: '<JSON>', isManaged: '<Boolean>' });
```
