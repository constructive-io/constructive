---
name: orm-public-app-step
description: Log of individual user actions toward level requirements; every single step ever taken is recorded here
---

# orm-public-app-step

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Log of individual user actions toward level requirements; every single step ever taken is recorded here

## Usage

```typescript
db.appStep.findMany({ select: { id: true } }).execute()
db.appStep.findOne({ id: '<value>', select: { id: true } }).execute()
db.appStep.create({ data: { actorId: '<value>', name: '<value>', count: '<value>' }, select: { id: true } }).execute()
db.appStep.update({ where: { id: '<value>' }, data: { actorId: '<new>' }, select: { id: true } }).execute()
db.appStep.delete({ where: { id: '<value>' } }).execute()
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
  data: { actorId: 'value', name: 'value', count: 'value' },
  select: { id: true }
}).execute();
```
