# platformGetSitePreviewsRecord

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for PlatformGetSitePreviewsRecord data operations

## Usage

```typescript
usePlatformGetSitePreviewsQuery({ selection: { fields: { commitId: true, name: true } } })
useCreatePlatformGetSitePreviewsRecordMutation({ selection: { fields: { id: true } } })
```

## Examples

### List all platformGetSitePreviews

```typescript
const { data, isLoading } = usePlatformGetSitePreviewsQuery({
  selection: { fields: { commitId: true, name: true } },
});
```

### Create a platformGetSitePreviewsRecord

```typescript
const { mutate } = useCreatePlatformGetSitePreviewsRecordMutation({
  selection: { fields: { id: true } },
});
mutate({ commitId: '<UUID>', name: '<String>' });
```
