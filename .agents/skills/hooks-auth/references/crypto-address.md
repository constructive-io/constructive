# cryptoAddress

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Cryptocurrency wallet addresses owned by users, with network-specific validation and verification

## Usage

```typescript
useCryptoAddressesQuery({ selection: { fields: { address: true, createdAt: true, id: true, isPrimary: true, isVerified: true, name: true, ownerId: true, updatedAt: true } } })
useCryptoAddressQuery({ id: '<UUID>', selection: { fields: { address: true, createdAt: true, id: true, isPrimary: true, isVerified: true, name: true, ownerId: true, updatedAt: true } } })
useCreateCryptoAddressMutation({ selection: { fields: { id: true } } })
useUpdateCryptoAddressMutation({ selection: { fields: { id: true } } })
useDeleteCryptoAddressMutation({})
```

## Examples

### List all cryptoAddresses

```typescript
const { data, isLoading } = useCryptoAddressesQuery({
  selection: { fields: { address: true, createdAt: true, id: true, isPrimary: true, isVerified: true, name: true, ownerId: true, updatedAt: true } },
});
```

### Create a cryptoAddress

```typescript
const { mutate } = useCreateCryptoAddressMutation({
  selection: { fields: { id: true } },
});
mutate({ address: '<String>', isPrimary: '<Boolean>', isVerified: '<Boolean>', name: '<String>', ownerId: '<UUID>' });
```
