# siteErrorPage

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Custom error pages for a site surface, keyed by HTTP status code

## Usage

```typescript
useSiteErrorPagesQuery({ selection: { fields: { createdAt: true, databaseId: true, id: true, objectPath: true, siteId: true, statusCode: true, updatedAt: true } } })
useSiteErrorPageQuery({ id: '<UUID>', selection: { fields: { createdAt: true, databaseId: true, id: true, objectPath: true, siteId: true, statusCode: true, updatedAt: true } } })
useCreateSiteErrorPageMutation({ selection: { fields: { id: true } } })
useUpdateSiteErrorPageMutation({ selection: { fields: { id: true } } })
useDeleteSiteErrorPageMutation({})
```

## Examples

### List all siteErrorPages

```typescript
const { data, isLoading } = useSiteErrorPagesQuery({
  selection: { fields: { createdAt: true, databaseId: true, id: true, objectPath: true, siteId: true, statusCode: true, updatedAt: true } },
});
```

### Create a siteErrorPage

```typescript
const { mutate } = useCreateSiteErrorPageMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', objectPath: '<String>', siteId: '<UUID>', statusCode: '<Int>' });
```
