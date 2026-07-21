# enum

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for Enum data operations

## Usage

```typescript
useEnumsQuery({ selection: { fields: { category: true, databaseId: true, description: true, id: true, label: true, name: true, schemaId: true, smartTags: true, tags: true, values: true } } })
useEnumQuery({ id: '<UUID>', selection: { fields: { category: true, databaseId: true, description: true, id: true, label: true, name: true, schemaId: true, smartTags: true, tags: true, values: true } } })
useCreateEnumMutation({ selection: { fields: { id: true } } })
useUpdateEnumMutation({ selection: { fields: { id: true } } })
useDeleteEnumMutation({})
```

## Examples

### List all enums

```typescript
const { data, isLoading } = useEnumsQuery({
  selection: { fields: { category: true, databaseId: true, description: true, id: true, label: true, name: true, schemaId: true, smartTags: true, tags: true, values: true } },
});
```

### Create a enum

```typescript
const { mutate } = useCreateEnumMutation({
  selection: { fields: { id: true } },
});
mutate({ category: '<ObjectCategory>', databaseId: '<UUID>', description: '<String>', label: '<String>', name: '<String>', schemaId: '<UUID>', smartTags: '<JSON>', tags: '<String>', values: '<String>' });
```
