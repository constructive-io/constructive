# platformEmailIdentity

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Outbound sender identity: the from/reply-to/support addresses a tenant sends as, and the provider account the mail leaves through

## Usage

```typescript
usePlatformEmailIdentitiesQuery({ selection: { fields: { createdAt: true, fromAddress: true, fromName: true, id: true, isActive: true, isDefault: true, name: true, providerAccountId: true, replyToAddress: true, supportAddress: true, transportMode: true, updatedAt: true } } })
usePlatformEmailIdentityQuery({ id: '<UUID>', selection: { fields: { createdAt: true, fromAddress: true, fromName: true, id: true, isActive: true, isDefault: true, name: true, providerAccountId: true, replyToAddress: true, supportAddress: true, transportMode: true, updatedAt: true } } })
useCreatePlatformEmailIdentityMutation({ selection: { fields: { id: true } } })
useUpdatePlatformEmailIdentityMutation({ selection: { fields: { id: true } } })
useDeletePlatformEmailIdentityMutation({})
```

## Examples

### List all platformEmailIdentities

```typescript
const { data, isLoading } = usePlatformEmailIdentitiesQuery({
  selection: { fields: { createdAt: true, fromAddress: true, fromName: true, id: true, isActive: true, isDefault: true, name: true, providerAccountId: true, replyToAddress: true, supportAddress: true, transportMode: true, updatedAt: true } },
});
```

### Create a platformEmailIdentity

```typescript
const { mutate } = useCreatePlatformEmailIdentityMutation({
  selection: { fields: { id: true } },
});
mutate({ fromAddress: '<String>', fromName: '<String>', isActive: '<Boolean>', isDefault: '<Boolean>', name: '<String>', providerAccountId: '<UUID>', replyToAddress: '<String>', supportAddress: '<String>', transportMode: '<String>' });
```
