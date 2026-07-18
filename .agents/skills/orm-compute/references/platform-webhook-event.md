# platformWebhookEvent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Durable webhook acceptance log — one row per accepted delivery, deduplicated on (endpoint_id, external_event_id), linked to the pending function invocation it enqueued

## Usage

```typescript
db.platformWebhookEvent.findMany({ select: { id: true } }).execute()
db.platformWebhookEvent.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformWebhookEvent.create({ data: { endpointId: '<UUID>', error: '<String>', externalEventId: '<String>', invocationCreatedAt: '<Datetime>', invocationId: '<UUID>', payload: '<JSON>', provider: '<String>', providerTimestamp: '<Datetime>', status: '<String>' }, select: { id: true } }).execute()
db.platformWebhookEvent.update({ where: { id: '<UUID>' }, data: { endpointId: '<UUID>' }, select: { id: true } }).execute()
db.platformWebhookEvent.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformWebhookEvent records

```typescript
const items = await db.platformWebhookEvent.findMany({
  select: { id: true, endpointId: true }
}).execute();
```

### Create a platformWebhookEvent

```typescript
const item = await db.platformWebhookEvent.create({
  data: { endpointId: '<UUID>', error: '<String>', externalEventId: '<String>', invocationCreatedAt: '<Datetime>', invocationId: '<UUID>', payload: '<JSON>', provider: '<String>', providerTimestamp: '<Datetime>', status: '<String>' },
  select: { id: true }
}).execute();
```
