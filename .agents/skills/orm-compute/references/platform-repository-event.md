# platformRepositoryEvent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Normalized repository events from local hooks and external providers

## Usage

```typescript
db.platformRepositoryEvent.findMany({ select: { id: true } }).execute()
db.platformRepositoryEvent.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformRepositoryEvent.create({ data: { actorId: '<UUID>', commitSha: '<String>', createdByPrincipal: '<UUID>', deliveryId: '<String>', eventType: '<String>', metadata: '<JSON>', payload: '<JSON>', ref: '<String>', repositoryId: '<UUID>', updatedByPrincipal: '<UUID>' }, select: { id: true } }).execute()
db.platformRepositoryEvent.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute()
db.platformRepositoryEvent.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformRepositoryEvent records

```typescript
const items = await db.platformRepositoryEvent.findMany({
  select: { id: true, actorId: true }
}).execute();
```

### Create a platformRepositoryEvent

```typescript
const item = await db.platformRepositoryEvent.create({
  data: { actorId: '<UUID>', commitSha: '<String>', createdByPrincipal: '<UUID>', deliveryId: '<String>', eventType: '<String>', metadata: '<JSON>', payload: '<JSON>', ref: '<String>', repositoryId: '<UUID>', updatedByPrincipal: '<UUID>' },
  select: { id: true }
}).execute();
```
