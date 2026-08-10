# plan

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Defines plan tiers with named limit configurations

## Usage

```typescript
db.plan.findMany({ select: { id: true } }).execute()
db.plan.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.plan.create({ data: { description: '<String>', isActive: '<Boolean>', name: '<String>' }, select: { id: true } }).execute()
db.plan.update({ where: { id: '<UUID>' }, data: { description: '<String>' }, select: { id: true } }).execute()
db.plan.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all plan records

```typescript
const items = await db.plan.findMany({
  select: { id: true, description: true }
}).execute();
```

### Create a plan

```typescript
const item = await db.plan.create({
  data: { description: '<String>', isActive: '<Boolean>', name: '<String>' },
  select: { id: true }
}).execute();
```
