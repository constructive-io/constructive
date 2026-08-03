# functionCapabilityBinding

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Capability bindings — declarative grants of typed resource capabilities (buckets) to function/graph holders per lifecycle

## Usage

```typescript
useFunctionCapabilityBindingsQuery({ selection: { fields: { bucketId: true, createdAt: true, databaseId: true, functionId: true, graphId: true, id: true, key: true, lifecycle: true, metadata: true, updatedAt: true } } })
useFunctionCapabilityBindingQuery({ id: '<UUID>', selection: { fields: { bucketId: true, createdAt: true, databaseId: true, functionId: true, graphId: true, id: true, key: true, lifecycle: true, metadata: true, updatedAt: true } } })
useCreateFunctionCapabilityBindingMutation({ selection: { fields: { id: true } } })
useUpdateFunctionCapabilityBindingMutation({ selection: { fields: { id: true } } })
useDeleteFunctionCapabilityBindingMutation({})
```

## Examples

### List all functionCapabilityBindings

```typescript
const { data, isLoading } = useFunctionCapabilityBindingsQuery({
  selection: { fields: { bucketId: true, createdAt: true, databaseId: true, functionId: true, graphId: true, id: true, key: true, lifecycle: true, metadata: true, updatedAt: true } },
});
```

### Create a functionCapabilityBinding

```typescript
const { mutate } = useCreateFunctionCapabilityBindingMutation({
  selection: { fields: { id: true } },
});
mutate({ bucketId: '<UUID>', databaseId: '<UUID>', functionId: '<UUID>', graphId: '<UUID>', key: '<String>', lifecycle: '<String>', metadata: '<JSON>' });
```
