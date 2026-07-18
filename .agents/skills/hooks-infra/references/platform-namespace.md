# platformNamespace

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Logical namespace containers for grouping secrets, config, functions, and other resources

## Usage

```typescript
usePlatformNamespacesQuery({ selection: { fields: { annotations: true, createdAt: true, description: true, id: true, isActive: true, isManaged: true, labels: true, lastError: true, name: true, namespaceName: true, status: true, updatedAt: true } } })
usePlatformNamespaceQuery({ id: '<UUID>', selection: { fields: { annotations: true, createdAt: true, description: true, id: true, isActive: true, isManaged: true, labels: true, lastError: true, name: true, namespaceName: true, status: true, updatedAt: true } } })
useCreatePlatformNamespaceMutation({ selection: { fields: { id: true } } })
useUpdatePlatformNamespaceMutation({ selection: { fields: { id: true } } })
useDeletePlatformNamespaceMutation({})
```

## Examples

### List all platformNamespaces

```typescript
const { data, isLoading } = usePlatformNamespacesQuery({
  selection: { fields: { annotations: true, createdAt: true, description: true, id: true, isActive: true, isManaged: true, labels: true, lastError: true, name: true, namespaceName: true, status: true, updatedAt: true } },
});
```

### Create a platformNamespace

```typescript
const { mutate } = useCreatePlatformNamespaceMutation({
  selection: { fields: { id: true } },
});
mutate({ annotations: '<JSON>', description: '<String>', isActive: '<Boolean>', isManaged: '<Boolean>', labels: '<JSON>', lastError: '<String>', name: '<String>', namespaceName: '<String>', status: '<String>' });
```
