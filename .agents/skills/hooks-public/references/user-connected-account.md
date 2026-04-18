# userConnectedAccount

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for UserConnectedAccount data operations

## Usage

```typescript
useUserConnectedAccountsQuery({ selection: { fields: { id: true, ownerId: true, service: true, identifier: true, details: true, isVerified: true, createdAt: true, updatedAt: true } } })
useUserConnectedAccountQuery({ id: '<UUID>', selection: { fields: { id: true, ownerId: true, service: true, identifier: true, details: true, isVerified: true, createdAt: true, updatedAt: true } } })
useCreateUserConnectedAccountMutation({ selection: { fields: { id: true } } })
useUpdateUserConnectedAccountMutation({ selection: { fields: { id: true } } })
useDeleteUserConnectedAccountMutation({})
```

## Examples

### List all userConnectedAccounts

```typescript
const { data, isLoading } = useUserConnectedAccountsQuery({
  selection: { fields: { id: true, ownerId: true, service: true, identifier: true, details: true, isVerified: true, createdAt: true, updatedAt: true } },
});
```

### Create a userConnectedAccount

```typescript
const { mutate } = useCreateUserConnectedAccountMutation({
  selection: { fields: { id: true } },
});
mutate({ ownerId: '<UUID>', service: '<String>', identifier: '<String>', details: '<JSON>', isVerified: '<Boolean>' });
```
