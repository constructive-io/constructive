# api

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

API endpoint configurations: each record defines a PostGraphile/PostgREST API with its database role and public access settings

## Usage

```typescript
useApisQuery({ selection: { fields: { annotations: true, anonRole: true, databaseId: true, dbname: true, id: true, isPublic: true, labels: true, name: true, roleName: true } } })
useApiQuery({ id: '<UUID>', selection: { fields: { annotations: true, anonRole: true, databaseId: true, dbname: true, id: true, isPublic: true, labels: true, name: true, roleName: true } } })
useCreateApiMutation({ selection: { fields: { id: true } } })
useUpdateApiMutation({ selection: { fields: { id: true } } })
useDeleteApiMutation({})
```

## Examples

### List all apis

```typescript
const { data, isLoading } = useApisQuery({
  selection: { fields: { annotations: true, anonRole: true, databaseId: true, dbname: true, id: true, isPublic: true, labels: true, name: true, roleName: true } },
});
```

### Create a api

```typescript
const { mutate } = useCreateApiMutation({
  selection: { fields: { id: true } },
});
mutate({ annotations: '<JSON>', anonRole: '<String>', databaseId: '<UUID>', dbname: '<String>', isPublic: '<Boolean>', labels: '<JSON>', name: '<String>', roleName: '<String>' });
```
