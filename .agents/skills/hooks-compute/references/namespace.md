# namespace

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Logical namespace containers for grouping secrets, config, functions, and other resources

## Usage

```typescript
useNamespacesQuery({ selection: { fields: { id: true, createdAt: true, updatedAt: true, name: true, namespaceName: true, description: true, isActive: true, status: true, lastError: true, labels: true, annotations: true, databaseId: true, isManaged: true } } })
useNamespaceQuery({ id: '<UUID>', selection: { fields: { id: true, createdAt: true, updatedAt: true, name: true, namespaceName: true, description: true, isActive: true, status: true, lastError: true, labels: true, annotations: true, databaseId: true, isManaged: true } } })
useCreateNamespaceMutation({ selection: { fields: { id: true } } })
useUpdateNamespaceMutation({ selection: { fields: { id: true } } })
useDeleteNamespaceMutation({})
```

## Examples

### List all namespaces

```typescript
const { data, isLoading } = useNamespacesQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, name: true, namespaceName: true, description: true, isActive: true, status: true, lastError: true, labels: true, annotations: true, databaseId: true, isManaged: true } },
});
```

### Create a namespace

```typescript
const { mutate } = useCreateNamespaceMutation({
  selection: { fields: { id: true } },
});
mutate({ name: '<String>', namespaceName: '<String>', description: '<String>', isActive: '<Boolean>', status: '<String>', lastError: '<String>', labels: '<JSON>', annotations: '<JSON>', databaseId: '<UUID>', isManaged: '<Boolean>' });
```
