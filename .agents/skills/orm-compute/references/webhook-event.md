# webhookEvent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Durable webhook acceptance log — one row per accepted delivery, deduplicated on (endpoint_id, external_event_id), linked to the pending function invocation it enqueued

## Usage

```typescript
db.webhookEvent.findMany({ select: { id: true } }).execute()
db.webhookEvent.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.webhookEvent.create({ data: { databaseId: '<UUID>', endpointId: '<UUID>', error: '<String>', externalEventId: '<String>', invocationCreatedAt: '<Datetime>', invocationId: '<UUID>', payload: '<JSON>', provider: '<String>', providerTimestamp: '<Datetime>', status: '<String>' }, select: { id: true } }).execute()
db.webhookEvent.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.webhookEvent.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all webhookEvent records

```typescript
const items = await db.webhookEvent.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a webhookEvent

```typescript
const item = await db.webhookEvent.create({
  data: { databaseId: '<UUID>', endpointId: '<UUID>', error: '<String>', externalEventId: '<String>', invocationCreatedAt: '<Datetime>', invocationId: '<UUID>', payload: '<JSON>', provider: '<String>', providerTimestamp: '<Datetime>', status: '<String>' },
  select: { id: true }
}).execute();
```
