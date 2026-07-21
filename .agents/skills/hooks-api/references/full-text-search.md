# fullTextSearch

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for FullTextSearch data operations

## Usage

```typescript
useFullTextSearchesQuery({ selection: { fields: { createdAt: true, databaseId: true, fieldId: true, fieldIds: true, id: true, langColumn: true, langs: true, tableId: true, updatedAt: true, weights: true } } })
useFullTextSearchQuery({ id: '<UUID>', selection: { fields: { createdAt: true, databaseId: true, fieldId: true, fieldIds: true, id: true, langColumn: true, langs: true, tableId: true, updatedAt: true, weights: true } } })
useCreateFullTextSearchMutation({ selection: { fields: { id: true } } })
useUpdateFullTextSearchMutation({ selection: { fields: { id: true } } })
useDeleteFullTextSearchMutation({})
```

## Examples

### List all fullTextSearches

```typescript
const { data, isLoading } = useFullTextSearchesQuery({
  selection: { fields: { createdAt: true, databaseId: true, fieldId: true, fieldIds: true, id: true, langColumn: true, langs: true, tableId: true, updatedAt: true, weights: true } },
});
```

### Create a fullTextSearch

```typescript
const { mutate } = useCreateFullTextSearchMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', fieldId: '<UUID>', fieldIds: '<UUID>', langColumn: '<String>', langs: '<String>', tableId: '<UUID>', weights: '<String>' });
```
