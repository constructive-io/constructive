# auditLog

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Append-only audit log of authentication events (sign-in, sign-up, password changes, etc.)

## Usage

```typescript
db.auditLog.findMany({ select: { id: true } }).execute()
db.auditLog.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.auditLog.create({ data: { event: '<String>', actorId: '<UUID>', origin: '<Origin>', userAgent: '<String>', ipAddress: '<InternetAddress>', success: '<Boolean>' }, select: { id: true } }).execute()
db.auditLog.update({ where: { id: '<UUID>' }, data: { event: '<String>' }, select: { id: true } }).execute()
db.auditLog.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all auditLog records

```typescript
const items = await db.auditLog.findMany({
  select: { id: true, event: true }
}).execute();
```

### Create a auditLog

```typescript
const item = await db.auditLog.create({
  data: { event: '<String>', actorId: '<UUID>', origin: '<Origin>', userAgent: '<String>', ipAddress: '<InternetAddress>', success: '<Boolean>' },
  select: { id: true }
}).execute();
```
