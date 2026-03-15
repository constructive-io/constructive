# api

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

API endpoint configurations: each record defines a PostGraphile/PostgREST API with its database role and public access settings

## Usage

```typescript
useApisQuery({ selection: { fields: { id: true, databaseId: true, name: true, dbname: true, roleName: true, anonRole: true, isPublic: true, nameTrgmSimilarity: true, dbnameTrgmSimilarity: true, roleNameTrgmSimilarity: true, anonRoleTrgmSimilarity: true, searchScore: true } } })
useApiQuery({ id: '<value>', selection: { fields: { id: true, databaseId: true, name: true, dbname: true, roleName: true, anonRole: true, isPublic: true, nameTrgmSimilarity: true, dbnameTrgmSimilarity: true, roleNameTrgmSimilarity: true, anonRoleTrgmSimilarity: true, searchScore: true } } })
useCreateApiMutation({ selection: { fields: { id: true } } })
useUpdateApiMutation({ selection: { fields: { id: true } } })
useDeleteApiMutation({})
```

## Examples

### List all apis

```typescript
const { data, isLoading } = useApisQuery({
  selection: { fields: { id: true, databaseId: true, name: true, dbname: true, roleName: true, anonRole: true, isPublic: true, nameTrgmSimilarity: true, dbnameTrgmSimilarity: true, roleNameTrgmSimilarity: true, anonRoleTrgmSimilarity: true, searchScore: true } },
});
```

### Create a api

```typescript
const { mutate } = useCreateApiMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<value>', name: '<value>', dbname: '<value>', roleName: '<value>', anonRole: '<value>', isPublic: '<value>', nameTrgmSimilarity: '<value>', dbnameTrgmSimilarity: '<value>', roleNameTrgmSimilarity: '<value>', anonRoleTrgmSimilarity: '<value>', searchScore: '<value>' });
```
