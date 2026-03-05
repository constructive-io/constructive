# auditLog

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Append-only audit log of authentication events (sign-in, sign-up, password changes, etc.)

## Usage

```typescript
db.auditLog.findMany({ select: { id: true } }).execute()
db.auditLog.findOne({ id: '<value>', select: { id: true } }).execute()
db.auditLog.create({ data: { event: '<value>', actorId: '<value>', origin: '<value>', userAgent: '<value>', ipAddress: '<value>', success: '<value>' }, select: { id: true } }).execute()
db.auditLog.update({ where: { id: '<value>' }, data: { event: '<new>' }, select: { id: true } }).execute()
db.auditLog.delete({ where: { id: '<value>' } }).execute()
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
  data: { event: 'value', actorId: 'value', origin: 'value', userAgent: 'value', ipAddress: 'value', success: 'value' },
  select: { id: true }
}).execute();
```
