# nodeTypeRegistry

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for NodeTypeRegistry data operations

## Usage

```typescript
useNodeTypeRegistriesQuery({ selection: { fields: { category: true, description: true, displayName: true, name: true, parameterSchema: true, slug: true, tags: true } } })
useNodeTypeRegistryQuery({ name: '<String>', selection: { fields: { category: true, description: true, displayName: true, name: true, parameterSchema: true, slug: true, tags: true } } })
useCreateNodeTypeRegistryMutation({ selection: { fields: { name: true } } })
useUpdateNodeTypeRegistryMutation({ selection: { fields: { name: true } } })
useDeleteNodeTypeRegistryMutation({})
```

## Examples

### List all nodeTypeRegistries

```typescript
const { data, isLoading } = useNodeTypeRegistriesQuery({
  selection: { fields: { category: true, description: true, displayName: true, name: true, parameterSchema: true, slug: true, tags: true } },
});
```

### Create a nodeTypeRegistry

```typescript
const { mutate } = useCreateNodeTypeRegistryMutation({
  selection: { fields: { name: true } },
});
mutate({ category: '<String>', description: '<String>', displayName: '<String>', parameterSchema: '<JSON>', slug: '<String>', tags: '<String>' });
```
