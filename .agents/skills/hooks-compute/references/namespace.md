# namespace

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Logical namespace containers for grouping secrets, config, functions, and other resources

## Usage

```typescript
useNamespacesQuery({ selection: { fields: { annotations: true, createdAt: true, databaseId: true, description: true, id: true, isActive: true, isManaged: true, labels: true, lastError: true, name: true, namespaceName: true, status: true, updatedAt: true } } })
useNamespaceQuery({ id: '<UUID>', selection: { fields: { annotations: true, createdAt: true, databaseId: true, description: true, id: true, isActive: true, isManaged: true, labels: true, lastError: true, name: true, namespaceName: true, status: true, updatedAt: true } } })
useCreateNamespaceMutation({ selection: { fields: { id: true } } })
useUpdateNamespaceMutation({ selection: { fields: { id: true } } })
useDeleteNamespaceMutation({})
```

## Examples

### List all namespaces

```typescript
const { data, isLoading } = useNamespacesQuery({
  selection: { fields: { annotations: true, createdAt: true, databaseId: true, description: true, id: true, isActive: true, isManaged: true, labels: true, lastError: true, name: true, namespaceName: true, status: true, updatedAt: true } },
});
```

### Create a namespace

```typescript
const { mutate } = useCreateNamespaceMutation({
  selection: { fields: { id: true } },
});
mutate({ annotations: '<JSON>', databaseId: '<UUID>', description: '<String>', isActive: '<Boolean>', isManaged: '<Boolean>', labels: '<JSON>', lastError: '<String>', name: '<String>', namespaceName: '<String>', status: '<String>' });
```
