# siteWebConfig

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Static-site serving configuration for a site surface (index document, clean URLs, SPA fallback)

## Usage

```typescript
useSiteWebConfigsQuery({ selection: { fields: { cleanUrls: true, createdAt: true, databaseId: true, id: true, indexDocument: true, metadata: true, siteId: true, spaFallback: true, updatedAt: true } } })
useSiteWebConfigQuery({ id: '<UUID>', selection: { fields: { cleanUrls: true, createdAt: true, databaseId: true, id: true, indexDocument: true, metadata: true, siteId: true, spaFallback: true, updatedAt: true } } })
useCreateSiteWebConfigMutation({ selection: { fields: { id: true } } })
useUpdateSiteWebConfigMutation({ selection: { fields: { id: true } } })
useDeleteSiteWebConfigMutation({})
```

## Examples

### List all siteWebConfigs

```typescript
const { data, isLoading } = useSiteWebConfigsQuery({
  selection: { fields: { cleanUrls: true, createdAt: true, databaseId: true, id: true, indexDocument: true, metadata: true, siteId: true, spaFallback: true, updatedAt: true } },
});
```

### Create a siteWebConfig

```typescript
const { mutate } = useCreateSiteWebConfigMutation({
  selection: { fields: { id: true } },
});
mutate({ cleanUrls: '<Boolean>', databaseId: '<UUID>', indexDocument: '<String>', metadata: '<JSON>', siteId: '<UUID>', spaFallback: '<Boolean>' });
```
