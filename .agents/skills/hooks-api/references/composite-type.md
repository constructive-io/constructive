# compositeType

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for CompositeType data operations

## Usage

```typescript
useCompositeTypesQuery({ selection: { fields: { attributes: true, category: true, databaseId: true, description: true, id: true, label: true, name: true, schemaId: true, smartTags: true, tags: true } } })
useCompositeTypeQuery({ id: '<UUID>', selection: { fields: { attributes: true, category: true, databaseId: true, description: true, id: true, label: true, name: true, schemaId: true, smartTags: true, tags: true } } })
useCreateCompositeTypeMutation({ selection: { fields: { id: true } } })
useUpdateCompositeTypeMutation({ selection: { fields: { id: true } } })
useDeleteCompositeTypeMutation({})
```

## Examples

### List all compositeTypes

```typescript
const { data, isLoading } = useCompositeTypesQuery({
  selection: { fields: { attributes: true, category: true, databaseId: true, description: true, id: true, label: true, name: true, schemaId: true, smartTags: true, tags: true } },
});
```

### Create a compositeType

```typescript
const { mutate } = useCreateCompositeTypeMutation({
  selection: { fields: { id: true } },
});
mutate({ attributes: '<JSON>', category: '<ObjectCategory>', databaseId: '<UUID>', description: '<String>', label: '<String>', name: '<String>', schemaId: '<UUID>', smartTags: '<JSON>', tags: '<String>' });
```
