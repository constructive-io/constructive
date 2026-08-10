# emailIdentity

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Outbound sender identity: the from/reply-to/support addresses a tenant sends as, and the provider account the mail leaves through

## Usage

```typescript
useEmailIdentitiesQuery({ selection: { fields: { createdAt: true, databaseId: true, fromAddress: true, fromName: true, id: true, isActive: true, isDefault: true, name: true, providerAccountId: true, replyToAddress: true, supportAddress: true, transportMode: true, updatedAt: true } } })
useEmailIdentityQuery({ id: '<UUID>', selection: { fields: { createdAt: true, databaseId: true, fromAddress: true, fromName: true, id: true, isActive: true, isDefault: true, name: true, providerAccountId: true, replyToAddress: true, supportAddress: true, transportMode: true, updatedAt: true } } })
useCreateEmailIdentityMutation({ selection: { fields: { id: true } } })
useUpdateEmailIdentityMutation({ selection: { fields: { id: true } } })
useDeleteEmailIdentityMutation({})
```

## Examples

### List all emailIdentities

```typescript
const { data, isLoading } = useEmailIdentitiesQuery({
  selection: { fields: { createdAt: true, databaseId: true, fromAddress: true, fromName: true, id: true, isActive: true, isDefault: true, name: true, providerAccountId: true, replyToAddress: true, supportAddress: true, transportMode: true, updatedAt: true } },
});
```

### Create a emailIdentity

```typescript
const { mutate } = useCreateEmailIdentityMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', fromAddress: '<String>', fromName: '<String>', isActive: '<Boolean>', isDefault: '<Boolean>', name: '<String>', providerAccountId: '<UUID>', replyToAddress: '<String>', supportAddress: '<String>', transportMode: '<String>' });
```
