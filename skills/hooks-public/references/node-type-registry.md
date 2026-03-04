# nodeTypeRegistry

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Registry of high-level semantic AST node types using domain-prefixed naming. These IR nodes compile to multiple targets (Postgres RLS, egress, ingress, etc.).

## Usage

```typescript
useNodeTypeRegistriesQuery({ selection: { fields: { name: true, slug: true, category: true, displayName: true, description: true, parameterSchema: true, tags: true, createdAt: true, updatedAt: true } } })
useNodeTypeRegistryQuery({ name: '<value>', selection: { fields: { name: true, slug: true, category: true, displayName: true, description: true, parameterSchema: true, tags: true, createdAt: true, updatedAt: true } } })
useCreateNodeTypeRegistryMutation({ selection: { fields: { name: true } } })
useUpdateNodeTypeRegistryMutation({ selection: { fields: { name: true } } })
useDeleteNodeTypeRegistryMutation({})
```

## Examples

### List all nodeTypeRegistries

```typescript
const { data, isLoading } = useNodeTypeRegistriesQuery({
  selection: { fields: { name: true, slug: true, category: true, displayName: true, description: true, parameterSchema: true, tags: true, createdAt: true, updatedAt: true } },
});
```

### Create a nodeTypeRegistry

```typescript
const { mutate } = useCreateNodeTypeRegistryMutation({
  selection: { fields: { name: true } },
});
mutate({ slug: '<value>', category: '<value>', displayName: '<value>', description: '<value>', parameterSchema: '<value>', tags: '<value>' });
```
