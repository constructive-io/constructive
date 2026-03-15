# user

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for User data operations

## Usage

```typescript
useUsersQuery({ selection: { fields: { id: true, username: true, displayName: true, profilePicture: true, searchTsv: true, type: true, createdAt: true, updatedAt: true, searchTsvRank: true, displayNameTrgmSimilarity: true, searchScore: true } } })
useUserQuery({ id: '<value>', selection: { fields: { id: true, username: true, displayName: true, profilePicture: true, searchTsv: true, type: true, createdAt: true, updatedAt: true, searchTsvRank: true, displayNameTrgmSimilarity: true, searchScore: true } } })
useCreateUserMutation({ selection: { fields: { id: true } } })
useUpdateUserMutation({ selection: { fields: { id: true } } })
useDeleteUserMutation({})
```

## Examples

### List all users

```typescript
const { data, isLoading } = useUsersQuery({
  selection: { fields: { id: true, username: true, displayName: true, profilePicture: true, searchTsv: true, type: true, createdAt: true, updatedAt: true, searchTsvRank: true, displayNameTrgmSimilarity: true, searchScore: true } },
});
```

### Create a user

```typescript
const { mutate } = useCreateUserMutation({
  selection: { fields: { id: true } },
});
mutate({ username: '<value>', displayName: '<value>', profilePicture: '<value>', searchTsv: '<value>', type: '<value>', searchTsvRank: '<value>', displayNameTrgmSimilarity: '<value>', searchScore: '<value>' });
```
