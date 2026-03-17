# phoneNumber

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

User phone numbers with country code, verification, and primary-number management

## Usage

```typescript
usePhoneNumbersQuery({ selection: { fields: { id: true, ownerId: true, cc: true, number: true, isVerified: true, isPrimary: true, createdAt: true, updatedAt: true, ccTrgmSimilarity: true, numberTrgmSimilarity: true, searchScore: true } } })
usePhoneNumberQuery({ id: '<value>', selection: { fields: { id: true, ownerId: true, cc: true, number: true, isVerified: true, isPrimary: true, createdAt: true, updatedAt: true, ccTrgmSimilarity: true, numberTrgmSimilarity: true, searchScore: true } } })
useCreatePhoneNumberMutation({ selection: { fields: { id: true } } })
useUpdatePhoneNumberMutation({ selection: { fields: { id: true } } })
useDeletePhoneNumberMutation({})
```

## Examples

### List all phoneNumbers

```typescript
const { data, isLoading } = usePhoneNumbersQuery({
  selection: { fields: { id: true, ownerId: true, cc: true, number: true, isVerified: true, isPrimary: true, createdAt: true, updatedAt: true, ccTrgmSimilarity: true, numberTrgmSimilarity: true, searchScore: true } },
});
```

### Create a phoneNumber

```typescript
const { mutate } = useCreatePhoneNumberMutation({
  selection: { fields: { id: true } },
});
mutate({ ownerId: '<value>', cc: '<value>', number: '<value>', isVerified: '<value>', isPrimary: '<value>', ccTrgmSimilarity: '<value>', numberTrgmSimilarity: '<value>', searchScore: '<value>' });
```
