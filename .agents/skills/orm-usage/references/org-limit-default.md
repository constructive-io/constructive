# orgLimitDefault

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Default maximum values for each named limit, applied when no per-actor override exists

## Usage

```typescript
db.orgLimitDefault.findMany({ select: { id: true } }).execute()
db.orgLimitDefault.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.orgLimitDefault.create({ data: { max: '<BigInt>', name: '<String>', softMax: '<BigInt>' }, select: { id: true } }).execute()
db.orgLimitDefault.update({ where: { id: '<UUID>' }, data: { max: '<BigInt>' }, select: { id: true } }).execute()
db.orgLimitDefault.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all orgLimitDefault records

```typescript
const items = await db.orgLimitDefault.findMany({
  select: { id: true, max: true }
}).execute();
```

### Create a orgLimitDefault

```typescript
const item = await db.orgLimitDefault.create({
  data: { max: '<BigInt>', name: '<String>', softMax: '<BigInt>' },
  select: { id: true }
}).execute();
```
