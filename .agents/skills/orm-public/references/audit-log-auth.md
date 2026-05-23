# auditLogAuth

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Partitioned append-only audit log of authentication events (sign-in, sign-up, password changes, etc.)

## Usage

```typescript
db.auditLogAuth.findMany({ select: { id: true } }).execute()
db.auditLogAuth.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.auditLogAuth.create({ data: { event: '<String>', actorId: '<UUID>', origin: '<Origin>', userAgent: '<String>', ipAddress: '<InternetAddress>', success: '<Boolean>' }, select: { id: true } }).execute()
db.auditLogAuth.update({ where: { id: '<UUID>' }, data: { event: '<String>' }, select: { id: true } }).execute()
db.auditLogAuth.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all auditLogAuth records

```typescript
const items = await db.auditLogAuth.findMany({
  select: { id: true, event: true }
}).execute();
```

### Create a auditLogAuth

```typescript
const item = await db.auditLogAuth.create({
  data: { event: '<String>', actorId: '<UUID>', origin: '<Origin>', userAgent: '<String>', ipAddress: '<InternetAddress>', success: '<Boolean>' },
  select: { id: true }
}).execute();
```
