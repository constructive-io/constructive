# siteMetadatum

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

SEO and social sharing metadata for a site surface

## Usage

```typescript
useSiteMetadataQuery({ selection: { fields: { appleTouchIcon: true, canonicalUrl: true, commitId: true, createdAt: true, databaseId: true, description: true, favicon: true, id: true, logo: true, ogImage: true, robots: true, robotsSeededFrom: true, siteId: true, storeId: true, title: true, updatedAt: true } } })
useSiteMetadatumQuery({ id: '<UUID>', selection: { fields: { appleTouchIcon: true, canonicalUrl: true, commitId: true, createdAt: true, databaseId: true, description: true, favicon: true, id: true, logo: true, ogImage: true, robots: true, robotsSeededFrom: true, siteId: true, storeId: true, title: true, updatedAt: true } } })
useCreateSiteMetadatumMutation({ selection: { fields: { id: true } } })
useUpdateSiteMetadatumMutation({ selection: { fields: { id: true } } })
useDeleteSiteMetadatumMutation({})
```

## Examples

### List all siteMetadata

```typescript
const { data, isLoading } = useSiteMetadataQuery({
  selection: { fields: { appleTouchIcon: true, canonicalUrl: true, commitId: true, createdAt: true, databaseId: true, description: true, favicon: true, id: true, logo: true, ogImage: true, robots: true, robotsSeededFrom: true, siteId: true, storeId: true, title: true, updatedAt: true } },
});
```

### Create a siteMetadatum

```typescript
const { mutate } = useCreateSiteMetadatumMutation({
  selection: { fields: { id: true } },
});
mutate({ appleTouchIcon: '<Image>', canonicalUrl: '<String>', commitId: '<UUID>', databaseId: '<UUID>', description: '<String>', favicon: '<Image>', logo: '<Image>', ogImage: '<Image>', robots: '<String>', robotsSeededFrom: '<JSON>', siteId: '<UUID>', storeId: '<UUID>', title: '<String>' });
```
