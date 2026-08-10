# planLimit

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Maps each plan to specific limit names and their maximum allowed values

## Usage

```typescript
db.planLimit.findMany({ select: { id: true } }).execute()
db.planLimit.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.planLimit.create({ data: { limitName: '<String>', maxValue: '<BigInt>', planId: '<UUID>' }, select: { id: true } }).execute()
db.planLimit.update({ where: { id: '<UUID>' }, data: { limitName: '<String>' }, select: { id: true } }).execute()
db.planLimit.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all planLimit records

```typescript
const items = await db.planLimit.findMany({
  select: { id: true, limitName: true }
}).execute();
```

### Create a planLimit

```typescript
const item = await db.planLimit.create({
  data: { limitName: '<String>', maxValue: '<BigInt>', planId: '<UUID>' },
  select: { id: true }
}).execute();
```
