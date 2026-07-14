# platformResourceEvent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Resource lifecycle events — audit log of provisioning, updates, and failure events

## Usage

```typescript
db.platformResourceEvent.findMany({ select: { id: true } }).execute()
db.platformResourceEvent.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformResourceEvent.create({ data: { actorId: '<UUID>', eventType: '<String>', message: '<String>', metadata: '<JSON>', resourceId: '<UUID>' }, select: { id: true } }).execute()
db.platformResourceEvent.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute()
db.platformResourceEvent.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformResourceEvent records

```typescript
const items = await db.platformResourceEvent.findMany({
  select: { id: true, actorId: true }
}).execute();
```

### Create a platformResourceEvent

```typescript
const item = await db.platformResourceEvent.create({
  data: { actorId: '<UUID>', eventType: '<String>', message: '<String>', metadata: '<JSON>', resourceId: '<UUID>' },
  select: { id: true }
}).execute();
```
