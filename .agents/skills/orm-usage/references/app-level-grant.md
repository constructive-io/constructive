# appLevelGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Records when a user achieves a level; prevents duplicate reward grants

## Usage

```typescript
db.appLevelGrant.findMany({ select: { id: true } }).execute()
db.appLevelGrant.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.appLevelGrant.create({ data: { actorId: '<UUID>', expiresAt: '<Datetime>', levelName: '<String>', periodStart: '<Datetime>' }, select: { id: true } }).execute()
db.appLevelGrant.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute()
db.appLevelGrant.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all appLevelGrant records

```typescript
const items = await db.appLevelGrant.findMany({
  select: { id: true, actorId: true }
}).execute();
```

### Create a appLevelGrant

```typescript
const item = await db.appLevelGrant.create({
  data: { actorId: '<UUID>', expiresAt: '<Datetime>', levelName: '<String>', periodStart: '<Datetime>' },
  select: { id: true }
}).execute();
```
