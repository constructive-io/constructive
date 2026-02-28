# hooks-siteMetadatum

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for SiteMetadatum data operations

## Usage

```typescript
useSiteMetadataQuery({ selection: { fields: { id: true, databaseId: true, siteId: true, title: true, description: true, ogImage: true } } })
useSiteMetadatumQuery({ id: '<value>', selection: { fields: { id: true, databaseId: true, siteId: true, title: true, description: true, ogImage: true } } })
useCreateSiteMetadatumMutation({ selection: { fields: { id: true } } })
useUpdateSiteMetadatumMutation({ selection: { fields: { id: true } } })
useDeleteSiteMetadatumMutation({})
```

## Examples

### List all siteMetadata

```typescript
const { data, isLoading } = useSiteMetadataQuery({
  selection: { fields: { id: true, databaseId: true, siteId: true, title: true, description: true, ogImage: true } },
});
```

### Create a siteMetadatum

```typescript
const { mutate } = useCreateSiteMetadatumMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<value>', siteId: '<value>', title: '<value>', description: '<value>', ogImage: '<value>' });
```
