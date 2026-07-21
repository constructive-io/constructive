# webhookEvent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Durable webhook acceptance log — one row per accepted delivery, deduplicated on (endpoint_id, external_event_id), linked to the pending function invocation it enqueued

## Usage

```typescript
useWebhookEventsQuery({ selection: { fields: { createdAt: true, databaseId: true, endpointId: true, error: true, externalEventId: true, id: true, invocationCreatedAt: true, invocationId: true, payload: true, provider: true, providerTimestamp: true, status: true, updatedAt: true } } })
useWebhookEventQuery({ id: '<UUID>', selection: { fields: { createdAt: true, databaseId: true, endpointId: true, error: true, externalEventId: true, id: true, invocationCreatedAt: true, invocationId: true, payload: true, provider: true, providerTimestamp: true, status: true, updatedAt: true } } })
useCreateWebhookEventMutation({ selection: { fields: { id: true } } })
useUpdateWebhookEventMutation({ selection: { fields: { id: true } } })
useDeleteWebhookEventMutation({})
```

## Examples

### List all webhookEvents

```typescript
const { data, isLoading } = useWebhookEventsQuery({
  selection: { fields: { createdAt: true, databaseId: true, endpointId: true, error: true, externalEventId: true, id: true, invocationCreatedAt: true, invocationId: true, payload: true, provider: true, providerTimestamp: true, status: true, updatedAt: true } },
});
```

### Create a webhookEvent

```typescript
const { mutate } = useCreateWebhookEventMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', endpointId: '<UUID>', error: '<String>', externalEventId: '<String>', invocationCreatedAt: '<Datetime>', invocationId: '<UUID>', payload: '<JSON>', provider: '<String>', providerTimestamp: '<Datetime>', status: '<String>' });
```
