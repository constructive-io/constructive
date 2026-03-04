# email

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

User email addresses with verification and primary-email management

## Usage

```typescript
useEmailsQuery({ selection: { fields: { id: true, ownerId: true, email: true, isVerified: true, isPrimary: true, createdAt: true, updatedAt: true } } })
useEmailQuery({ id: '<value>', selection: { fields: { id: true, ownerId: true, email: true, isVerified: true, isPrimary: true, createdAt: true, updatedAt: true } } })
useCreateEmailMutation({ selection: { fields: { id: true } } })
useUpdateEmailMutation({ selection: { fields: { id: true } } })
useDeleteEmailMutation({})
```

## Examples

### List all emails

```typescript
const { data, isLoading } = useEmailsQuery({
  selection: { fields: { id: true, ownerId: true, email: true, isVerified: true, isPrimary: true, createdAt: true, updatedAt: true } },
});
```

### Create a email

```typescript
const { mutate } = useCreateEmailMutation({
  selection: { fields: { id: true } },
});
mutate({ ownerId: '<value>', email: '<value>', isVerified: '<value>', isPrimary: '<value>' });
```
