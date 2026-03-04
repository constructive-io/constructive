---
name: hooks-auth-audit-log
description: Append-only audit log of authentication events (sign-in, sign-up, password changes, etc.)
---

# hooks-auth-audit-log

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Append-only audit log of authentication events (sign-in, sign-up, password changes, etc.)

## Usage

```typescript
useAuditLogsQuery({ selection: { fields: { id: true, event: true, actorId: true, origin: true, userAgent: true, ipAddress: true, success: true, createdAt: true } } })
useAuditLogQuery({ id: '<value>', selection: { fields: { id: true, event: true, actorId: true, origin: true, userAgent: true, ipAddress: true, success: true, createdAt: true } } })
useCreateAuditLogMutation({ selection: { fields: { id: true } } })
useUpdateAuditLogMutation({ selection: { fields: { id: true } } })
useDeleteAuditLogMutation({})
```

## Examples

### List all auditLogs

```typescript
const { data, isLoading } = useAuditLogsQuery({
  selection: { fields: { id: true, event: true, actorId: true, origin: true, userAgent: true, ipAddress: true, success: true, createdAt: true } },
});
```

### Create a auditLog

```typescript
const { mutate } = useCreateAuditLogMutation({
  selection: { fields: { id: true } },
});
mutate({ event: '<value>', actorId: '<value>', origin: '<value>', userAgent: '<value>', ipAddress: '<value>', success: '<value>' });
```
