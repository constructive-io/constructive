# appLimitWarning

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Warning configuration for soft limits. Each row defines a warning threshold and the job task to enqueue when usage approaches it.

## Usage

```typescript
db.appLimitWarning.findMany({ select: { id: true } }).execute()
db.appLimitWarning.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.appLimitWarning.create({ data: { name: '<String>', warningType: '<String>', thresholdValue: '<BigInt>', taskIdentifier: '<String>' }, select: { id: true } }).execute()
db.appLimitWarning.update({ where: { id: '<UUID>' }, data: { name: '<String>' }, select: { id: true } }).execute()
db.appLimitWarning.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all appLimitWarning records

```typescript
const items = await db.appLimitWarning.findMany({
  select: { id: true, name: true }
}).execute();
```

### Create a appLimitWarning

```typescript
const item = await db.appLimitWarning.create({
  data: { name: '<String>', warningType: '<String>', thresholdValue: '<BigInt>', taskIdentifier: '<String>' },
  select: { id: true }
}).execute();
```
