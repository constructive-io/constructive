# platformFunctionCapabilityBinding

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Capability bindings — declarative grants of typed resource capabilities (buckets) to function/graph holders per lifecycle

## Usage

```typescript
usePlatformFunctionCapabilityBindingsQuery({ selection: { fields: { bucketId: true, createdAt: true, functionId: true, graphId: true, id: true, key: true, lifecycle: true, metadata: true, updatedAt: true } } })
usePlatformFunctionCapabilityBindingQuery({ id: '<UUID>', selection: { fields: { bucketId: true, createdAt: true, functionId: true, graphId: true, id: true, key: true, lifecycle: true, metadata: true, updatedAt: true } } })
useCreatePlatformFunctionCapabilityBindingMutation({ selection: { fields: { id: true } } })
useUpdatePlatformFunctionCapabilityBindingMutation({ selection: { fields: { id: true } } })
useDeletePlatformFunctionCapabilityBindingMutation({})
```

## Examples

### List all platformFunctionCapabilityBindings

```typescript
const { data, isLoading } = usePlatformFunctionCapabilityBindingsQuery({
  selection: { fields: { bucketId: true, createdAt: true, functionId: true, graphId: true, id: true, key: true, lifecycle: true, metadata: true, updatedAt: true } },
});
```

### Create a platformFunctionCapabilityBinding

```typescript
const { mutate } = useCreatePlatformFunctionCapabilityBindingMutation({
  selection: { fields: { id: true } },
});
mutate({ bucketId: '<UUID>', functionId: '<UUID>', graphId: '<UUID>', key: '<String>', lifecycle: '<String>', metadata: '<JSON>' });
```
