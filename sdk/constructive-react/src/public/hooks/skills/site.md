# hooks-site

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for Site data operations

## Usage

```typescript
useSitesQuery({ selection: { fields: { id: true, databaseId: true, title: true, description: true, ogImage: true, favicon: true, appleTouchIcon: true, logo: true, dbname: true } } })
useSiteQuery({ id: '<value>', selection: { fields: { id: true, databaseId: true, title: true, description: true, ogImage: true, favicon: true, appleTouchIcon: true, logo: true, dbname: true } } })
useCreateSiteMutation({ selection: { fields: { id: true } } })
useUpdateSiteMutation({ selection: { fields: { id: true } } })
useDeleteSiteMutation({})
```

## Examples

### List all sites

```typescript
const { data, isLoading } = useSitesQuery({
  selection: { fields: { id: true, databaseId: true, title: true, description: true, ogImage: true, favicon: true, appleTouchIcon: true, logo: true, dbname: true } },
});
```

### Create a site

```typescript
const { mutate } = useCreateSiteMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<value>', title: '<value>', description: '<value>', ogImage: '<value>', favicon: '<value>', appleTouchIcon: '<value>', logo: '<value>', dbname: '<value>' });
```
