# ledger

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Append-only event log for all billing events (usage, grants, adjustments)

## Usage

```typescript
db.ledger.findMany({ select: { id: true } }).execute()
db.ledger.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.ledger.create({ data: { delta: '<BigInt>', entityId: '<UUID>', entityType: '<String>', entryType: '<String>', ledgerClass: '<String>', metadata: '<JSON>', meterSlug: '<String>', organizationId: '<UUID>', usageAfter: '<BigInt>' }, select: { id: true } }).execute()
db.ledger.update({ where: { id: '<UUID>' }, data: { delta: '<BigInt>' }, select: { id: true } }).execute()
db.ledger.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all ledger records

```typescript
const items = await db.ledger.findMany({
  select: { id: true, delta: true }
}).execute();
```

### Create a ledger

```typescript
const item = await db.ledger.create({
  data: { delta: '<BigInt>', entityId: '<UUID>', entityType: '<String>', entryType: '<String>', ledgerClass: '<String>', metadata: '<JSON>', meterSlug: '<String>', organizationId: '<UUID>', usageAfter: '<BigInt>' },
  select: { id: true }
}).execute();
```
