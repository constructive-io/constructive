# nodeTypeRegistry

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for NodeTypeRegistry data operations

## Usage

```typescript
useNodeTypeRegistriesQuery({ selection: { fields: { name: true, slug: true, category: true, displayName: true, description: true, parameterSchema: true, tags: true } } })
useNodeTypeRegistryQuery({ name: '<String>', selection: { fields: { name: true, slug: true, category: true, displayName: true, description: true, parameterSchema: true, tags: true } } })
useCreateNodeTypeRegistryMutation({ selection: { fields: { name: true } } })
useUpdateNodeTypeRegistryMutation({ selection: { fields: { name: true } } })
useDeleteNodeTypeRegistryMutation({})
```

## Examples

### List all nodeTypeRegistries

```typescript
const { data, isLoading } = useNodeTypeRegistriesQuery({
  selection: { fields: { name: true, slug: true, category: true, displayName: true, description: true, parameterSchema: true, tags: true } },
});
```

### Create a nodeTypeRegistry

```typescript
const { mutate } = useCreateNodeTypeRegistryMutation({
  selection: { fields: { name: true } },
});
mutate({ slug: '<String>', category: '<String>', displayName: '<String>', description: '<String>', parameterSchema: '<JSON>', tags: '<String>' });
```
