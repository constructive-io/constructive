# userConnectedAccount

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for UserConnectedAccount data operations

## Usage

```typescript
useUserConnectedAccountsQuery({ selection: { fields: { createdAt: true, details: true, id: true, identifier: true, isVerified: true, ownerId: true, service: true, updatedAt: true } } })
useUserConnectedAccountQuery({ id: '<UUID>', selection: { fields: { createdAt: true, details: true, id: true, identifier: true, isVerified: true, ownerId: true, service: true, updatedAt: true } } })
useCreateUserConnectedAccountMutation({ selection: { fields: { id: true } } })
useUpdateUserConnectedAccountMutation({ selection: { fields: { id: true } } })
useDeleteUserConnectedAccountMutation({})
```

## Examples

### List all userConnectedAccounts

```typescript
const { data, isLoading } = useUserConnectedAccountsQuery({
  selection: { fields: { createdAt: true, details: true, id: true, identifier: true, isVerified: true, ownerId: true, service: true, updatedAt: true } },
});
```

### Create a userConnectedAccount

```typescript
const { mutate } = useCreateUserConnectedAccountMutation({
  selection: { fields: { id: true } },
});
mutate({ details: '<JSON>', identifier: '<String>', isVerified: '<Boolean>', ownerId: '<UUID>', service: '<String>' });
```
