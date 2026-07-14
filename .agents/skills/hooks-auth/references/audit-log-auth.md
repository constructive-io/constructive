# auditLogAuth

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Partitioned append-only audit log of authentication events (sign-in, sign-up, password changes, etc.)

## Usage

```typescript
useAuditLogAuthsQuery({ selection: { fields: { actorId: true, createdAt: true, event: true, id: true, ipAddress: true, origin: true, success: true, userAgent: true } } })
useAuditLogAuthQuery({ id: '<UUID>', selection: { fields: { actorId: true, createdAt: true, event: true, id: true, ipAddress: true, origin: true, success: true, userAgent: true } } })
useCreateAuditLogAuthMutation({ selection: { fields: { id: true } } })
useUpdateAuditLogAuthMutation({ selection: { fields: { id: true } } })
useDeleteAuditLogAuthMutation({})
```

## Examples

### List all auditLogAuths

```typescript
const { data, isLoading } = useAuditLogAuthsQuery({
  selection: { fields: { actorId: true, createdAt: true, event: true, id: true, ipAddress: true, origin: true, success: true, userAgent: true } },
});
```

### Create a auditLogAuth

```typescript
const { mutate } = useCreateAuditLogAuthMutation({
  selection: { fields: { id: true } },
});
mutate({ actorId: '<UUID>', event: '<String>', ipAddress: '<InternetAddress>', origin: '<Origin>', success: '<Boolean>', userAgent: '<String>' });
```
