# api

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

API surfaces exposed by this scope; publication makes a surface bindable from other scopes

## Usage

```typescript
useApisQuery({ selection: { fields: { anonRole: true, config: true, createdAt: true, databaseId: true, dbname: true, id: true, isPublished: true, name: true, roleName: true, updatedAt: true } } })
useApiQuery({ id: '<UUID>', selection: { fields: { anonRole: true, config: true, createdAt: true, databaseId: true, dbname: true, id: true, isPublished: true, name: true, roleName: true, updatedAt: true } } })
useCreateApiMutation({ selection: { fields: { id: true } } })
useUpdateApiMutation({ selection: { fields: { id: true } } })
useDeleteApiMutation({})
```

## Examples

### List all apis

```typescript
const { data, isLoading } = useApisQuery({
  selection: { fields: { anonRole: true, config: true, createdAt: true, databaseId: true, dbname: true, id: true, isPublished: true, name: true, roleName: true, updatedAt: true } },
});
```

### Create a api

```typescript
const { mutate } = useCreateApiMutation({
  selection: { fields: { id: true } },
});
mutate({ anonRole: '<String>', config: '<JSON>', databaseId: '<UUID>', dbname: '<String>', isPublished: '<Boolean>', name: '<String>', roleName: '<String>' });
```
