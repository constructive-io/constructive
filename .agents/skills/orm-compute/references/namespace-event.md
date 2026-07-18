# namespaceEvent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Namespace lifecycle events — audit log of creation, activation, deactivation, label changes

## Usage

```typescript
db.namespaceEvent.findMany({ select: { id: true } }).execute()
db.namespaceEvent.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.namespaceEvent.create({ data: { actorId: '<UUID>', databaseId: '<UUID>', eventType: '<String>', message: '<String>', metadata: '<JSON>', namespaceId: '<UUID>' }, select: { id: true } }).execute()
db.namespaceEvent.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute()
db.namespaceEvent.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all namespaceEvent records

```typescript
const items = await db.namespaceEvent.findMany({
  select: { id: true, actorId: true }
}).execute();
```

### Create a namespaceEvent

```typescript
const item = await db.namespaceEvent.create({
  data: { actorId: '<UUID>', databaseId: '<UUID>', eventType: '<String>', message: '<String>', metadata: '<JSON>', namespaceId: '<UUID>' },
  select: { id: true }
}).execute();
```
