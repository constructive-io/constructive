# apis

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

API surfaces exposed by this scope; publication makes a surface bindable from other scopes

## Usage

```typescript
useApisesQuery({ selection: { fields: { anonRole: true, config: true, createdAt: true, databaseId: true, dbname: true, id: true, isPublished: true, name: true, roleName: true, updatedAt: true } } })
useApisQuery({ id: '<UUID>', selection: { fields: { anonRole: true, config: true, createdAt: true, databaseId: true, dbname: true, id: true, isPublished: true, name: true, roleName: true, updatedAt: true } } })
useCreateApisMutation({ selection: { fields: { id: true } } })
useUpdateApisMutation({ selection: { fields: { id: true } } })
useDeleteApisMutation({})
```

## Examples

### List all apises

```typescript
const { data, isLoading } = useApisesQuery({
  selection: { fields: { anonRole: true, config: true, createdAt: true, databaseId: true, dbname: true, id: true, isPublished: true, name: true, roleName: true, updatedAt: true } },
});
```

### Create a apis

```typescript
const { mutate } = useCreateApisMutation({
  selection: { fields: { id: true } },
});
mutate({ anonRole: '<String>', config: '<JSON>', databaseId: '<UUID>', dbname: '<String>', isPublished: '<Boolean>', name: '<String>', roleName: '<String>' });
```
