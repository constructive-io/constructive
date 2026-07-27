# site

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Site surfaces exposed by this scope; publication makes a surface bindable from other scopes

## Usage

```typescript
useSitesQuery({ selection: { fields: { config: true, createdAt: true, databaseId: true, description: true, id: true, isPublished: true, name: true, title: true, updatedAt: true } } })
useSiteQuery({ id: '<UUID>', selection: { fields: { config: true, createdAt: true, databaseId: true, description: true, id: true, isPublished: true, name: true, title: true, updatedAt: true } } })
useCreateSiteMutation({ selection: { fields: { id: true } } })
useUpdateSiteMutation({ selection: { fields: { id: true } } })
useDeleteSiteMutation({})
```

## Examples

### List all sites

```typescript
const { data, isLoading } = useSitesQuery({
  selection: { fields: { config: true, createdAt: true, databaseId: true, description: true, id: true, isPublished: true, name: true, title: true, updatedAt: true } },
});
```

### Create a site

```typescript
const { mutate } = useCreateSiteMutation({
  selection: { fields: { id: true } },
});
mutate({ config: '<JSON>', databaseId: '<UUID>', description: '<String>', isPublished: '<Boolean>', name: '<String>', title: '<String>' });
```
