# orgLimitWarning

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Warning configuration for soft limits. Each row defines a warning threshold and the job task to enqueue when usage approaches it.

## Usage

```typescript
db.orgLimitWarning.findMany({ select: { id: true } }).execute()
db.orgLimitWarning.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.orgLimitWarning.create({ data: { entityId: '<UUID>', name: '<String>', taskIdentifier: '<String>', thresholdValue: '<BigInt>', warningType: '<String>' }, select: { id: true } }).execute()
db.orgLimitWarning.update({ where: { id: '<UUID>' }, data: { entityId: '<UUID>' }, select: { id: true } }).execute()
db.orgLimitWarning.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all orgLimitWarning records

```typescript
const items = await db.orgLimitWarning.findMany({
  select: { id: true, entityId: true }
}).execute();
```

### Create a orgLimitWarning

```typescript
const item = await db.orgLimitWarning.create({
  data: { entityId: '<UUID>', name: '<String>', taskIdentifier: '<String>', thresholdValue: '<BigInt>', warningType: '<String>' },
  select: { id: true }
}).execute();
```
