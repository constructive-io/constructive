---
name: hooks-public-api
description: API endpoint configurations: each record defines a PostGraphile/PostgREST API with its database role and public access settings
---

# hooks-public-api

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

API endpoint configurations: each record defines a PostGraphile/PostgREST API with its database role and public access settings

## Usage

```typescript
useApisQuery({ selection: { fields: { id: true, databaseId: true, name: true, dbname: true, roleName: true, anonRole: true, isPublic: true } } })
useApiQuery({ id: '<value>', selection: { fields: { id: true, databaseId: true, name: true, dbname: true, roleName: true, anonRole: true, isPublic: true } } })
useCreateApiMutation({ selection: { fields: { id: true } } })
useUpdateApiMutation({ selection: { fields: { id: true } } })
useDeleteApiMutation({})
```

## Examples

### List all apis

```typescript
const { data, isLoading } = useApisQuery({
  selection: { fields: { id: true, databaseId: true, name: true, dbname: true, roleName: true, anonRole: true, isPublic: true } },
});
```

### Create a api

```typescript
const { mutate } = useCreateApiMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<value>', name: '<value>', dbname: '<value>', roleName: '<value>', anonRole: '<value>', isPublic: '<value>' });
```
