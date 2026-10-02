# platformFunctionSchedule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Function schedules — user-facing cron schedules synced into the worker scheduler (app_jobs.scheduled_jobs)

## Usage

```typescript
db.platformFunctionSchedule.findMany({ select: { id: true } }).execute()
db.platformFunctionSchedule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformFunctionSchedule.create({ data: { description: '<String>', functionDefinitionId: '<UUID>', isActive: '<Boolean>', name: '<String>', payload: '<JSON>', scheduleInfo: '<JSON>', suspendedAt: '<Datetime>', suspendedReason: '<String>' }, select: { id: true } }).execute()
db.platformFunctionSchedule.update({ where: { id: '<UUID>' }, data: { description: '<String>' }, select: { id: true } }).execute()
db.platformFunctionSchedule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformFunctionSchedule records

```typescript
const items = await db.platformFunctionSchedule.findMany({
  select: { id: true, description: true }
}).execute();
```

### Create a platformFunctionSchedule

```typescript
const item = await db.platformFunctionSchedule.create({
  data: { description: '<String>', functionDefinitionId: '<UUID>', isActive: '<Boolean>', name: '<String>', payload: '<JSON>', scheduleInfo: '<JSON>', suspendedAt: '<Datetime>', suspendedReason: '<String>' },
  select: { id: true }
}).execute();
```
