# platformSiteErrorPage

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Custom error pages for a site surface, keyed by HTTP status code

## Usage

```typescript
usePlatformSiteErrorPagesQuery({ selection: { fields: { createdAt: true, id: true, objectPath: true, siteId: true, statusCode: true, updatedAt: true } } })
usePlatformSiteErrorPageQuery({ id: '<UUID>', selection: { fields: { createdAt: true, id: true, objectPath: true, siteId: true, statusCode: true, updatedAt: true } } })
useCreatePlatformSiteErrorPageMutation({ selection: { fields: { id: true } } })
useUpdatePlatformSiteErrorPageMutation({ selection: { fields: { id: true } } })
useDeletePlatformSiteErrorPageMutation({})
```

## Examples

### List all platformSiteErrorPages

```typescript
const { data, isLoading } = usePlatformSiteErrorPagesQuery({
  selection: { fields: { createdAt: true, id: true, objectPath: true, siteId: true, statusCode: true, updatedAt: true } },
});
```

### Create a platformSiteErrorPage

```typescript
const { mutate } = useCreatePlatformSiteErrorPageMutation({
  selection: { fields: { id: true } },
});
mutate({ objectPath: '<String>', siteId: '<UUID>', statusCode: '<Int>' });
```
