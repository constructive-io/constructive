# membershipType

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Defines the different scopes of membership (e.g. App Member, Organization Member, Group Member)

## Usage

```typescript
useMembershipTypesQuery({ selection: { fields: { description: true, hasUsersTableEntry: true, id: true, name: true, parentMembershipType: true, scope: true } } })
useMembershipTypeQuery({ id: '<Int>', selection: { fields: { description: true, hasUsersTableEntry: true, id: true, name: true, parentMembershipType: true, scope: true } } })
useCreateMembershipTypeMutation({ selection: { fields: { id: true } } })
useUpdateMembershipTypeMutation({ selection: { fields: { id: true } } })
useDeleteMembershipTypeMutation({})
```

## Examples

### List all membershipTypes

```typescript
const { data, isLoading } = useMembershipTypesQuery({
  selection: { fields: { description: true, hasUsersTableEntry: true, id: true, name: true, parentMembershipType: true, scope: true } },
});
```

### Create a membershipType

```typescript
const { mutate } = useCreateMembershipTypeMutation({
  selection: { fields: { id: true } },
});
mutate({ description: '<String>', hasUsersTableEntry: '<Boolean>', name: '<String>', parentMembershipType: '<Int>', scope: '<String>' });
```
