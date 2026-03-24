# cryptoAddress

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Cryptocurrency wallet addresses owned by users, with network-specific validation and verification

## Usage

```typescript
useCryptoAddressesQuery({ selection: { fields: { id: true, ownerId: true, address: true, isVerified: true, isPrimary: true, createdAt: true, updatedAt: true } } })
useCryptoAddressQuery({ id: '<UUID>', selection: { fields: { id: true, ownerId: true, address: true, isVerified: true, isPrimary: true, createdAt: true, updatedAt: true } } })
useCreateCryptoAddressMutation({ selection: { fields: { id: true } } })
useUpdateCryptoAddressMutation({ selection: { fields: { id: true } } })
useDeleteCryptoAddressMutation({})
```

## Examples

### List all cryptoAddresses

```typescript
const { data, isLoading } = useCryptoAddressesQuery({
  selection: { fields: { id: true, ownerId: true, address: true, isVerified: true, isPrimary: true, createdAt: true, updatedAt: true } },
});
```

### Create a cryptoAddress

```typescript
const { mutate } = useCreateCryptoAddressMutation({
  selection: { fields: { id: true } },
});
mutate({ ownerId: '<UUID>', address: '<String>', isVerified: '<Boolean>', isPrimary: '<Boolean>' });
```
