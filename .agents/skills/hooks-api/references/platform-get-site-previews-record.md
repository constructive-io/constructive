# platformGetSitePreviewsRecord

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for PlatformGetSitePreviewsRecord data operations

## Usage

```typescript
usePlatformGetSitePreviewsQuery({ selection: { fields: { commitId: true, name: true } } })
```

## Examples

### List all platformGetSitePreviews

```typescript
const { data, isLoading } = usePlatformGetSitePreviewsQuery({
  selection: { fields: { commitId: true, name: true } },
});
```
