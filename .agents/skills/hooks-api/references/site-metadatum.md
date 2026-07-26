# siteMetadatum

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

SEO and social sharing metadata for a site surface

## Usage

```typescript
useSiteMetadataQuery({ selection: { fields: { createdAt: true, databaseId: true, description: true, id: true, ogImage: true, siteId: true, title: true, updatedAt: true } } })
useSiteMetadatumQuery({ id: '<UUID>', selection: { fields: { createdAt: true, databaseId: true, description: true, id: true, ogImage: true, siteId: true, title: true, updatedAt: true } } })
useCreateSiteMetadatumMutation({ selection: { fields: { id: true } } })
useUpdateSiteMetadatumMutation({ selection: { fields: { id: true } } })
useDeleteSiteMetadatumMutation({})
```

## Examples

### List all siteMetadata

```typescript
const { data, isLoading } = useSiteMetadataQuery({
  selection: { fields: { createdAt: true, databaseId: true, description: true, id: true, ogImage: true, siteId: true, title: true, updatedAt: true } },
});
```

### Create a siteMetadatum

```typescript
const { mutate } = useCreateSiteMetadatumMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', description: '<String>', ogImage: '<Image>', siteId: '<UUID>', title: '<String>' });
```
