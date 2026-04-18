# membershipType

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Defines the different scopes of membership (e.g. App Member, Organization Member, Group Member)

## Usage

```typescript
useMembershipTypesQuery({ selection: { fields: { id: true, name: true, description: true, prefix: true, parentMembershipType: true, hasUsersTableEntry: true } } })
useMembershipTypeQuery({ id: '<Int>', selection: { fields: { id: true, name: true, description: true, prefix: true, parentMembershipType: true, hasUsersTableEntry: true } } })
useCreateMembershipTypeMutation({ selection: { fields: { id: true } } })
useUpdateMembershipTypeMutation({ selection: { fields: { id: true } } })
useDeleteMembershipTypeMutation({})
```

## Examples

### List all membershipTypes

```typescript
const { data, isLoading } = useMembershipTypesQuery({
  selection: { fields: { id: true, name: true, description: true, prefix: true, parentMembershipType: true, hasUsersTableEntry: true } },
});
```

### Create a membershipType

```typescript
const { mutate } = useCreateMembershipTypeMutation({
  selection: { fields: { id: true } },
});
mutate({ name: '<String>', description: '<String>', prefix: '<String>', parentMembershipType: '<Int>', hasUsersTableEntry: '<Boolean>' });
```
