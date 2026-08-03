# page

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Site-owned page content — merkle-versioned head over the infra store; never a routing surface

## Usage

```typescript
usePagesQuery({ selection: { fields: { commitId: true, content: true, createdAt: true, databaseId: true, id: true, siteId: true, slug: true, storeId: true, updatedAt: true } } })
usePageQuery({ id: '<UUID>', selection: { fields: { commitId: true, content: true, createdAt: true, databaseId: true, id: true, siteId: true, slug: true, storeId: true, updatedAt: true } } })
useCreatePageMutation({ selection: { fields: { id: true } } })
useUpdatePageMutation({ selection: { fields: { id: true } } })
useDeletePageMutation({})
```

## Examples

### List all pages

```typescript
const { data, isLoading } = usePagesQuery({
  selection: { fields: { commitId: true, content: true, createdAt: true, databaseId: true, id: true, siteId: true, slug: true, storeId: true, updatedAt: true } },
});
```

### Create a page

```typescript
const { mutate } = useCreatePageMutation({
  selection: { fields: { id: true } },
});
mutate({ commitId: '<UUID>', content: '<JSON>', databaseId: '<UUID>', siteId: '<UUID>', slug: '<String>', storeId: '<UUID>' });
```
