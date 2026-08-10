# planOverride

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Per-entity limit overrides that take precedence over plan defaults

## Usage

```typescript
db.planOverride.findMany({ select: { id: true } }).execute()
db.planOverride.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.planOverride.create({ data: { entityId: '<UUID>', expiresAt: '<Datetime>', limitName: '<String>', maxValue: '<BigInt>', reason: '<String>' }, select: { id: true } }).execute()
db.planOverride.update({ where: { id: '<UUID>' }, data: { entityId: '<UUID>' }, select: { id: true } }).execute()
db.planOverride.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all planOverride records

```typescript
const items = await db.planOverride.findMany({
  select: { id: true, entityId: true }
}).execute();
```

### Create a planOverride

```typescript
const item = await db.planOverride.create({
  data: { entityId: '<UUID>', expiresAt: '<Datetime>', limitName: '<String>', maxValue: '<BigInt>', reason: '<String>' },
  select: { id: true }
}).execute();
```
