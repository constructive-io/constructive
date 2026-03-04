---
name: hooks-public-membership-type
description: Defines the different scopes of membership (e.g. App Member, Organization Member, Group Member)
---

# hooks-public-membership-type

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Defines the different scopes of membership (e.g. App Member, Organization Member, Group Member)

## Usage

```typescript
useMembershipTypesQuery({ selection: { fields: { id: true, name: true, description: true, prefix: true } } })
useMembershipTypeQuery({ id: '<value>', selection: { fields: { id: true, name: true, description: true, prefix: true } } })
useCreateMembershipTypeMutation({ selection: { fields: { id: true } } })
useUpdateMembershipTypeMutation({ selection: { fields: { id: true } } })
useDeleteMembershipTypeMutation({})
```

## Examples

### List all membershipTypes

```typescript
const { data, isLoading } = useMembershipTypesQuery({
  selection: { fields: { id: true, name: true, description: true, prefix: true } },
});
```

### Create a membershipType

```typescript
const { mutate } = useCreateMembershipTypeMutation({
  selection: { fields: { id: true } },
});
mutate({ name: '<value>', description: '<value>', prefix: '<value>' });
```
