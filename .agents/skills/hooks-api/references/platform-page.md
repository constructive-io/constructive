# platformPage

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Site-owned page content — merkle-versioned head over the infra store; never a routing surface

## Usage

```typescript
usePlatformPagesQuery({ selection: { fields: { commitId: true, content: true, createdAt: true, id: true, siteId: true, slug: true, storeId: true, updatedAt: true } } })
usePlatformPageQuery({ id: '<UUID>', selection: { fields: { commitId: true, content: true, createdAt: true, id: true, siteId: true, slug: true, storeId: true, updatedAt: true } } })
useCreatePlatformPageMutation({ selection: { fields: { id: true } } })
useUpdatePlatformPageMutation({ selection: { fields: { id: true } } })
useDeletePlatformPageMutation({})
```

## Examples

### List all platformPages

```typescript
const { data, isLoading } = usePlatformPagesQuery({
  selection: { fields: { commitId: true, content: true, createdAt: true, id: true, siteId: true, slug: true, storeId: true, updatedAt: true } },
});
```

### Create a platformPage

```typescript
const { mutate } = useCreatePlatformPageMutation({
  selection: { fields: { id: true } },
});
mutate({ commitId: '<UUID>', content: '<JSON>', siteId: '<UUID>', slug: '<String>', storeId: '<UUID>' });
```
