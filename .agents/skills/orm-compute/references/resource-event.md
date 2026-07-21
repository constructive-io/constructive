# resourceEvent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Resource lifecycle events — audit log of provisioning, updates, and failure events

## Usage

```typescript
db.resourceEvent.findMany({ select: { id: true } }).execute()
db.resourceEvent.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.resourceEvent.create({ data: { actorId: '<UUID>', databaseId: '<UUID>', eventType: '<String>', message: '<String>', metadata: '<JSON>', resourceId: '<UUID>' }, select: { id: true } }).execute()
db.resourceEvent.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute()
db.resourceEvent.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all resourceEvent records

```typescript
const items = await db.resourceEvent.findMany({
  select: { id: true, actorId: true }
}).execute();
```

### Create a resourceEvent

```typescript
const item = await db.resourceEvent.create({
  data: { actorId: '<UUID>', databaseId: '<UUID>', eventType: '<String>', message: '<String>', metadata: '<JSON>', resourceId: '<UUID>' },
  select: { id: true }
}).execute();
```
