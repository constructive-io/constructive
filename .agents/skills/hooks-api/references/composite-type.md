# compositeType

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for CompositeType data operations

## Usage

```typescript
useCompositeTypesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, name: true, label: true, description: true, attributes: true, smartTags: true, category: true, module: true, scope: true, tags: true } } })
useCompositeTypeQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, schemaId: true, name: true, label: true, description: true, attributes: true, smartTags: true, category: true, module: true, scope: true, tags: true } } })
useCreateCompositeTypeMutation({ selection: { fields: { id: true } } })
useUpdateCompositeTypeMutation({ selection: { fields: { id: true } } })
useDeleteCompositeTypeMutation({})
```

## Examples

### List all compositeTypes

```typescript
const { data, isLoading } = useCompositeTypesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, name: true, label: true, description: true, attributes: true, smartTags: true, category: true, module: true, scope: true, tags: true } },
});
```

### Create a compositeType

```typescript
const { mutate } = useCreateCompositeTypeMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', schemaId: '<UUID>', name: '<String>', label: '<String>', description: '<String>', attributes: '<JSON>', smartTags: '<JSON>', category: '<ObjectCategory>', module: '<String>', scope: '<Int>', tags: '<String>' });
```
