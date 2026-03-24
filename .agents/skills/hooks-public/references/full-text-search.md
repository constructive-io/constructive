# fullTextSearch

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for FullTextSearch data operations

## Usage

```typescript
useFullTextSearchesQuery({ selection: { fields: { id: true, databaseId: true, tableId: true, fieldId: true, fieldIds: true, weights: true, langs: true, createdAt: true, updatedAt: true } } })
useFullTextSearchQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, tableId: true, fieldId: true, fieldIds: true, weights: true, langs: true, createdAt: true, updatedAt: true } } })
useCreateFullTextSearchMutation({ selection: { fields: { id: true } } })
useUpdateFullTextSearchMutation({ selection: { fields: { id: true } } })
useDeleteFullTextSearchMutation({})
```

## Examples

### List all fullTextSearches

```typescript
const { data, isLoading } = useFullTextSearchesQuery({
  selection: { fields: { id: true, databaseId: true, tableId: true, fieldId: true, fieldIds: true, weights: true, langs: true, createdAt: true, updatedAt: true } },
});
```

### Create a fullTextSearch

```typescript
const { mutate } = useCreateFullTextSearchMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', tableId: '<UUID>', fieldId: '<UUID>', fieldIds: '<UUID>', weights: '<String>', langs: '<String>' });
```
