# platformWebhookEvent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Durable webhook acceptance log — one row per accepted delivery, deduplicated on (endpoint_id, external_event_id), linked to the pending function invocation it enqueued

## Usage

```typescript
usePlatformWebhookEventsQuery({ selection: { fields: { createdAt: true, endpointId: true, error: true, externalEventId: true, id: true, invocationCreatedAt: true, invocationId: true, payload: true, provider: true, providerTimestamp: true, status: true, updatedAt: true } } })
usePlatformWebhookEventQuery({ id: '<UUID>', selection: { fields: { createdAt: true, endpointId: true, error: true, externalEventId: true, id: true, invocationCreatedAt: true, invocationId: true, payload: true, provider: true, providerTimestamp: true, status: true, updatedAt: true } } })
useCreatePlatformWebhookEventMutation({ selection: { fields: { id: true } } })
useUpdatePlatformWebhookEventMutation({ selection: { fields: { id: true } } })
useDeletePlatformWebhookEventMutation({})
```

## Examples

### List all platformWebhookEvents

```typescript
const { data, isLoading } = usePlatformWebhookEventsQuery({
  selection: { fields: { createdAt: true, endpointId: true, error: true, externalEventId: true, id: true, invocationCreatedAt: true, invocationId: true, payload: true, provider: true, providerTimestamp: true, status: true, updatedAt: true } },
});
```

### Create a platformWebhookEvent

```typescript
const { mutate } = useCreatePlatformWebhookEventMutation({
  selection: { fields: { id: true } },
});
mutate({ endpointId: '<UUID>', error: '<String>', externalEventId: '<String>', invocationCreatedAt: '<Datetime>', invocationId: '<UUID>', payload: '<JSON>', provider: '<String>', providerTimestamp: '<Datetime>', status: '<String>' });
```
