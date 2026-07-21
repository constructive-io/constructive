# siteMetadatum

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

SEO and social sharing metadata for a site: page title, description, and Open Graph image

## Usage

```typescript
useSiteMetadataQuery({ selection: { fields: { databaseId: true, description: true, id: true, ogImage: true, siteId: true, title: true } } })
useSiteMetadatumQuery({ id: '<UUID>', selection: { fields: { databaseId: true, description: true, id: true, ogImage: true, siteId: true, title: true } } })
useCreateSiteMetadatumMutation({ selection: { fields: { id: true } } })
useUpdateSiteMetadatumMutation({ selection: { fields: { id: true } } })
useDeleteSiteMetadatumMutation({})
```

## Examples

### List all siteMetadata

```typescript
const { data, isLoading } = useSiteMetadataQuery({
  selection: { fields: { databaseId: true, description: true, id: true, ogImage: true, siteId: true, title: true } },
});
```

### Create a siteMetadatum

```typescript
const { mutate } = useCreateSiteMetadatumMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', description: '<String>', ogImage: '<Image>', siteId: '<UUID>', title: '<String>' });
```
