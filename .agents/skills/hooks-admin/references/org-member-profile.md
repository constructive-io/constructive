# orgMemberProfile

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Per-membership profile information visible to other entity members (display name, email, title, bio, avatar)

## Usage

```typescript
useOrgMemberProfilesQuery({ selection: { fields: { id: true, createdAt: true, updatedAt: true, membershipId: true, entityId: true, actorId: true, displayName: true, email: true, title: true, bio: true, profilePicture: true } } })
useOrgMemberProfileQuery({ id: '<UUID>', selection: { fields: { id: true, createdAt: true, updatedAt: true, membershipId: true, entityId: true, actorId: true, displayName: true, email: true, title: true, bio: true, profilePicture: true } } })
useCreateOrgMemberProfileMutation({ selection: { fields: { id: true } } })
useUpdateOrgMemberProfileMutation({ selection: { fields: { id: true } } })
useDeleteOrgMemberProfileMutation({})
```

## Examples

### List all orgMemberProfiles

```typescript
const { data, isLoading } = useOrgMemberProfilesQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, membershipId: true, entityId: true, actorId: true, displayName: true, email: true, title: true, bio: true, profilePicture: true } },
});
```

### Create a orgMemberProfile

```typescript
const { mutate } = useCreateOrgMemberProfileMutation({
  selection: { fields: { id: true } },
});
mutate({ membershipId: '<UUID>', entityId: '<UUID>', actorId: '<UUID>', displayName: '<String>', email: '<String>', title: '<String>', bio: '<String>', profilePicture: '<Image>' });
```
