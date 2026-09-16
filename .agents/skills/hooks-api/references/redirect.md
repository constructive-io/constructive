# redirect

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Redirect targets a route can point at; the edge answers with a redirect status instead of a backend

## Usage

```typescript
useRedirectsQuery({ selection: { fields: { createdAt: true, databaseId: true, id: true, name: true, preservePath: true, preserveQuery: true, statusCode: true, toHost: true, toPath: true, updatedAt: true } } })
useRedirectQuery({ id: '<UUID>', selection: { fields: { createdAt: true, databaseId: true, id: true, name: true, preservePath: true, preserveQuery: true, statusCode: true, toHost: true, toPath: true, updatedAt: true } } })
useCreateRedirectMutation({ selection: { fields: { id: true } } })
useUpdateRedirectMutation({ selection: { fields: { id: true } } })
useDeleteRedirectMutation({})
```

## Examples

### List all redirects

```typescript
const { data, isLoading } = useRedirectsQuery({
  selection: { fields: { createdAt: true, databaseId: true, id: true, name: true, preservePath: true, preserveQuery: true, statusCode: true, toHost: true, toPath: true, updatedAt: true } },
});
```

### Create a redirect

```typescript
const { mutate } = useCreateRedirectMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', name: '<String>', preservePath: '<Boolean>', preserveQuery: '<Boolean>', statusCode: '<Int>', toHost: '<String>', toPath: '<String>' });
```
