# connectedAccount

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

OAuth and social login connections linking external service accounts to users

## Usage

```typescript
useConnectedAccountsQuery({ selection: { fields: { id: true, ownerId: true, service: true, identifier: true, details: true, isVerified: true, createdAt: true, updatedAt: true, serviceTrgmSimilarity: true, identifierTrgmSimilarity: true, searchScore: true } } })
useConnectedAccountQuery({ id: '<value>', selection: { fields: { id: true, ownerId: true, service: true, identifier: true, details: true, isVerified: true, createdAt: true, updatedAt: true, serviceTrgmSimilarity: true, identifierTrgmSimilarity: true, searchScore: true } } })
useCreateConnectedAccountMutation({ selection: { fields: { id: true } } })
useUpdateConnectedAccountMutation({ selection: { fields: { id: true } } })
useDeleteConnectedAccountMutation({})
```

## Examples

### List all connectedAccounts

```typescript
const { data, isLoading } = useConnectedAccountsQuery({
  selection: { fields: { id: true, ownerId: true, service: true, identifier: true, details: true, isVerified: true, createdAt: true, updatedAt: true, serviceTrgmSimilarity: true, identifierTrgmSimilarity: true, searchScore: true } },
});
```

### Create a connectedAccount

```typescript
const { mutate } = useCreateConnectedAccountMutation({
  selection: { fields: { id: true } },
});
mutate({ ownerId: '<value>', service: '<value>', identifier: '<value>', details: '<value>', isVerified: '<value>', serviceTrgmSimilarity: '<value>', identifierTrgmSimilarity: '<value>', searchScore: '<value>' });
```
