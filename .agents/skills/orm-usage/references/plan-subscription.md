# planSubscription

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Assigns a plan to an entity with subscription lifecycle (start, end, active state)

## Usage

```typescript
db.planSubscription.findMany({ select: { id: true } }).execute()
db.planSubscription.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.planSubscription.create({ data: { endsAt: '<Datetime>', entityId: '<UUID>', entityType: '<String>', isActive: '<Boolean>', organizationId: '<UUID>', planId: '<UUID>', startsAt: '<Datetime>' }, select: { id: true } }).execute()
db.planSubscription.update({ where: { id: '<UUID>' }, data: { endsAt: '<Datetime>' }, select: { id: true } }).execute()
db.planSubscription.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all planSubscription records

```typescript
const items = await db.planSubscription.findMany({
  select: { id: true, endsAt: true }
}).execute();
```

### Create a planSubscription

```typescript
const item = await db.planSubscription.create({
  data: { endsAt: '<Datetime>', entityId: '<UUID>', entityType: '<String>', isActive: '<Boolean>', organizationId: '<UUID>', planId: '<UUID>', startsAt: '<Datetime>' },
  select: { id: true }
}).execute();
```
