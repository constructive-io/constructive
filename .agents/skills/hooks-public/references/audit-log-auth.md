# auditLogAuth

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Partitioned append-only audit log of authentication events (sign-in, sign-up, password changes, etc.)

## Usage

```typescript
useAuditLogAuthsQuery({ selection: { fields: { createdAt: true, id: true, event: true, actorId: true, origin: true, userAgent: true, ipAddress: true, success: true } } })
useAuditLogAuthQuery({ id: '<UUID>', selection: { fields: { createdAt: true, id: true, event: true, actorId: true, origin: true, userAgent: true, ipAddress: true, success: true } } })
useCreateAuditLogAuthMutation({ selection: { fields: { id: true } } })
useUpdateAuditLogAuthMutation({ selection: { fields: { id: true } } })
useDeleteAuditLogAuthMutation({})
```

## Examples

### List all auditLogAuths

```typescript
const { data, isLoading } = useAuditLogAuthsQuery({
  selection: { fields: { createdAt: true, id: true, event: true, actorId: true, origin: true, userAgent: true, ipAddress: true, success: true } },
});
```

### Create a auditLogAuth

```typescript
const { mutate } = useCreateAuditLogAuthMutation({
  selection: { fields: { id: true } },
});
mutate({ event: '<String>', actorId: '<UUID>', origin: '<Origin>', userAgent: '<String>', ipAddress: '<InternetAddress>', success: '<Boolean>' });
```
