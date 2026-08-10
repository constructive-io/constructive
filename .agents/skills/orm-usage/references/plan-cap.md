# planCap

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Maps each plan to feature flag cap values (written to limit_caps when plan is applied)

## Usage

```typescript
db.planCap.findMany({ select: { id: true } }).execute()
db.planCap.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.planCap.create({ data: { capName: '<String>', capValue: '<BigInt>', planId: '<UUID>' }, select: { id: true } }).execute()
db.planCap.update({ where: { id: '<UUID>' }, data: { capName: '<String>' }, select: { id: true } }).execute()
db.planCap.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all planCap records

```typescript
const items = await db.planCap.findMany({
  select: { id: true, capName: true }
}).execute();
```

### Create a planCap

```typescript
const item = await db.planCap.create({
  data: { capName: '<String>', capValue: '<BigInt>', planId: '<UUID>' },
  select: { id: true }
}).execute();
```
