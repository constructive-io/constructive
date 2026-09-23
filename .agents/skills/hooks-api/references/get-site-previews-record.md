# getSitePreviewsRecord

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for GetSitePreviewsRecord data operations

## Usage

```typescript
useGetSitePreviewsQuery({ selection: { fields: { commitId: true, name: true } } })
useCreateGetSitePreviewsRecordMutation({ selection: { fields: { id: true } } })
```

## Examples

### List all getSitePreviews

```typescript
const { data, isLoading } = useGetSitePreviewsQuery({
  selection: { fields: { commitId: true, name: true } },
});
```

### Create a getSitePreviewsRecord

```typescript
const { mutate } = useCreateGetSitePreviewsRecordMutation({
  selection: { fields: { id: true } },
});
mutate({ commitId: '<UUID>', name: '<String>' });
```
