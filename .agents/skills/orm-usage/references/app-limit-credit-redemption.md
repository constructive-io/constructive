# appLimitCreditRedemption

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Append-only ledger of code redemptions; AFTER INSERT trigger validates and cascades to limit_credits

## Usage

```typescript
db.appLimitCreditRedemption.findMany({ select: { id: true } }).execute()
db.appLimitCreditRedemption.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.appLimitCreditRedemption.create({ data: { creditCodeId: '<UUID>', entityId: '<UUID>', organizationId: '<UUID>', entityType: '<String>' }, select: { id: true } }).execute()
db.appLimitCreditRedemption.update({ where: { id: '<UUID>' }, data: { creditCodeId: '<UUID>' }, select: { id: true } }).execute()
db.appLimitCreditRedemption.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all appLimitCreditRedemption records

```typescript
const items = await db.appLimitCreditRedemption.findMany({
  select: { id: true, creditCodeId: true }
}).execute();
```

### Create a appLimitCreditRedemption

```typescript
const item = await db.appLimitCreditRedemption.create({
  data: { creditCodeId: '<UUID>', entityId: '<UUID>', organizationId: '<UUID>', entityType: '<String>' },
  select: { id: true }
}).execute();
```
