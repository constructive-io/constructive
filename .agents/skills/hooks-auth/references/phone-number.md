# phoneNumber

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

User phone numbers with country code, verification, and primary-number management

## Usage

```typescript
usePhoneNumbersQuery({ selection: { fields: { cc: true, createdAt: true, id: true, isPrimary: true, isVerified: true, name: true, number: true, ownerId: true, updatedAt: true } } })
usePhoneNumberQuery({ id: '<UUID>', selection: { fields: { cc: true, createdAt: true, id: true, isPrimary: true, isVerified: true, name: true, number: true, ownerId: true, updatedAt: true } } })
useCreatePhoneNumberMutation({ selection: { fields: { id: true } } })
useUpdatePhoneNumberMutation({ selection: { fields: { id: true } } })
useDeletePhoneNumberMutation({})
```

## Examples

### List all phoneNumbers

```typescript
const { data, isLoading } = usePhoneNumbersQuery({
  selection: { fields: { cc: true, createdAt: true, id: true, isPrimary: true, isVerified: true, name: true, number: true, ownerId: true, updatedAt: true } },
});
```

### Create a phoneNumber

```typescript
const { mutate } = useCreatePhoneNumberMutation({
  selection: { fields: { id: true } },
});
mutate({ cc: '<String>', isPrimary: '<Boolean>', isVerified: '<Boolean>', name: '<String>', number: '<String>', ownerId: '<UUID>' });
```
