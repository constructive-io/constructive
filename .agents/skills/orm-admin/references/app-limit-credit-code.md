# appLimitCreditCode

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Redeemable credit codes managed by admins with the add_credits permission

## Usage

```typescript
db.appLimitCreditCode.findMany({ select: { id: true } }).execute()
db.appLimitCreditCode.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.appLimitCreditCode.create({ data: { code: '<String>', maxRedemptions: '<Int>', currentRedemptions: '<Int>', expiresAt: '<Datetime>' }, select: { id: true } }).execute()
db.appLimitCreditCode.update({ where: { id: '<UUID>' }, data: { code: '<String>' }, select: { id: true } }).execute()
db.appLimitCreditCode.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all appLimitCreditCode records

```typescript
const items = await db.appLimitCreditCode.findMany({
  select: { id: true, code: true }
}).execute();
```

### Create a appLimitCreditCode

```typescript
const item = await db.appLimitCreditCode.create({
  data: { code: '<String>', maxRedemptions: '<Int>', currentRedemptions: '<Int>', expiresAt: '<Datetime>' },
  select: { id: true }
}).execute();
```
