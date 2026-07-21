# user

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for User data operations

## Usage

```typescript
useUsersQuery({ selection: { fields: { createdAt: true, displayName: true, displayNameTrgmSimilarity: true, id: true, profilePicture: true, searchScore: true, searchTsv: true, searchTsvRank: true, type: true, updatedAt: true, username: true } } })
useUserQuery({ id: '<UUID>', selection: { fields: { createdAt: true, displayName: true, displayNameTrgmSimilarity: true, id: true, profilePicture: true, searchScore: true, searchTsv: true, searchTsvRank: true, type: true, updatedAt: true, username: true } } })
useCreateUserMutation({ selection: { fields: { id: true } } })
useUpdateUserMutation({ selection: { fields: { id: true } } })
useDeleteUserMutation({})
```

## Examples

### List all users

```typescript
const { data, isLoading } = useUsersQuery({
  selection: { fields: { createdAt: true, displayName: true, displayNameTrgmSimilarity: true, id: true, profilePicture: true, searchScore: true, searchTsv: true, searchTsvRank: true, type: true, updatedAt: true, username: true } },
});
```

### Create a user

```typescript
const { mutate } = useCreateUserMutation({
  selection: { fields: { id: true } },
});
mutate({ displayName: '<String>', displayNameTrgmSimilarity: '<Float>', profilePicture: '<Image>', searchScore: '<Float>', searchTsv: '<FullText>', searchTsvRank: '<Float>', type: '<Int>', username: '<String>' });
```
