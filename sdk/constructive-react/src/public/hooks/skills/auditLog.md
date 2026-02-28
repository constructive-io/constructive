# hooks-auditLog

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for AuditLog data operations

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
