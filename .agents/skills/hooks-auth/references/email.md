# email

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

User email addresses with verification and primary-email management

## Usage

```typescript
useEmailsQuery({ selection: { fields: { createdAt: true, email: true, id: true, isPrimary: true, isVerified: true, name: true, ownerId: true, updatedAt: true } } })
useEmailQuery({ id: '<UUID>', selection: { fields: { createdAt: true, email: true, id: true, isPrimary: true, isVerified: true, name: true, ownerId: true, updatedAt: true } } })
useCreateEmailMutation({ selection: { fields: { id: true } } })
useUpdateEmailMutation({ selection: { fields: { id: true } } })
useDeleteEmailMutation({})
```

## Examples

### List all emails

```typescript
const { data, isLoading } = useEmailsQuery({
  selection: { fields: { createdAt: true, email: true, id: true, isPrimary: true, isVerified: true, name: true, ownerId: true, updatedAt: true } },
});
```

### Create a email

```typescript
const { mutate } = useCreateEmailMutation({
  selection: { fields: { id: true } },
});
mutate({ email: '<Email>', isPrimary: '<Boolean>', isVerified: '<Boolean>', name: '<String>', ownerId: '<UUID>' });
```
