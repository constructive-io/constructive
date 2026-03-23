# appStep

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Log of individual user actions toward level requirements; every single step ever taken is recorded here

## Usage

```typescript
db.appStep.findMany({ select: { id: true } }).execute()
db.appStep.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.appStep.create({ data: { actorId: '<UUID>', name: '<String>', count: '<Int>' }, select: { id: true } }).execute()
db.appStep.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute()
db.appStep.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all appStep records

```typescript
const items = await db.appStep.findMany({
  select: { id: true, actorId: true }
}).execute();
```

### Create a appStep

```typescript
const item = await db.appStep.create({
  data: { actorId: '<UUID>', name: '<String>', count: '<Int>' },
  select: { id: true }
}).execute();
```
