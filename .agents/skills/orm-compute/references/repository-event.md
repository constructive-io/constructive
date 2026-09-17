# repositoryEvent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Normalized repository events from local hooks and external providers

## Usage

```typescript
db.repositoryEvent.findMany({ select: { id: true } }).execute()
db.repositoryEvent.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.repositoryEvent.create({ data: { actorId: '<UUID>', commitSha: '<String>', createdByPrincipal: '<UUID>', databaseId: '<UUID>', deliveryId: '<String>', eventType: '<String>', metadata: '<JSON>', payload: '<JSON>', ref: '<String>', repositoryId: '<UUID>', updatedByPrincipal: '<UUID>' }, select: { id: true } }).execute()
db.repositoryEvent.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute()
db.repositoryEvent.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all repositoryEvent records

```typescript
const items = await db.repositoryEvent.findMany({
  select: { id: true, actorId: true }
}).execute();
```

### Create a repositoryEvent

```typescript
const item = await db.repositoryEvent.create({
  data: { actorId: '<UUID>', commitSha: '<String>', createdByPrincipal: '<UUID>', databaseId: '<UUID>', deliveryId: '<String>', eventType: '<String>', metadata: '<JSON>', payload: '<JSON>', ref: '<String>', repositoryId: '<UUID>', updatedByPrincipal: '<UUID>' },
  select: { id: true }
}).execute();
```
