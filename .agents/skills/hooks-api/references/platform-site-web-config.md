# platformSiteWebConfig

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Static-site serving configuration for a site surface (index document, clean URLs, SPA fallback)

## Usage

```typescript
usePlatformSiteWebConfigsQuery({ selection: { fields: { cleanUrls: true, createdAt: true, id: true, indexDocument: true, metadata: true, siteId: true, spaFallback: true, updatedAt: true } } })
usePlatformSiteWebConfigQuery({ id: '<UUID>', selection: { fields: { cleanUrls: true, createdAt: true, id: true, indexDocument: true, metadata: true, siteId: true, spaFallback: true, updatedAt: true } } })
useCreatePlatformSiteWebConfigMutation({ selection: { fields: { id: true } } })
useUpdatePlatformSiteWebConfigMutation({ selection: { fields: { id: true } } })
useDeletePlatformSiteWebConfigMutation({})
```

## Examples

### List all platformSiteWebConfigs

```typescript
const { data, isLoading } = usePlatformSiteWebConfigsQuery({
  selection: { fields: { cleanUrls: true, createdAt: true, id: true, indexDocument: true, metadata: true, siteId: true, spaFallback: true, updatedAt: true } },
});
```

### Create a platformSiteWebConfig

```typescript
const { mutate } = useCreatePlatformSiteWebConfigMutation({
  selection: { fields: { id: true } },
});
mutate({ cleanUrls: '<Boolean>', indexDocument: '<String>', metadata: '<JSON>', siteId: '<UUID>', spaFallback: '<Boolean>' });
```
