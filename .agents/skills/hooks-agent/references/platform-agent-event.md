# platformAgentEvent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Append-only transcript of an agent run: one agent session entry per row, stored verbatim

## Usage

```typescript
usePlatformAgentEventsQuery({ selection: { fields: { actorId: true, createdAt: true, entry: true, id: true, recordedAt: true, runId: true, seq: true, transcriptFormat: true, transcriptVersion: true, updatedAt: true, visibility: true } } })
usePlatformAgentEventQuery({ id: '<UUID>', selection: { fields: { actorId: true, createdAt: true, entry: true, id: true, recordedAt: true, runId: true, seq: true, transcriptFormat: true, transcriptVersion: true, updatedAt: true, visibility: true } } })
useCreatePlatformAgentEventMutation({ selection: { fields: { id: true } } })
useUpdatePlatformAgentEventMutation({ selection: { fields: { id: true } } })
useDeletePlatformAgentEventMutation({})
```

## Examples

### List all platformAgentEvents

```typescript
const { data, isLoading } = usePlatformAgentEventsQuery({
  selection: { fields: { actorId: true, createdAt: true, entry: true, id: true, recordedAt: true, runId: true, seq: true, transcriptFormat: true, transcriptVersion: true, updatedAt: true, visibility: true } },
});
```

### Create a platformAgentEvent

```typescript
const { mutate } = useCreatePlatformAgentEventMutation({
  selection: { fields: { id: true } },
});
mutate({ actorId: '<UUID>', entry: '<JSON>', recordedAt: '<Datetime>', runId: '<UUID>', seq: '<Int>', transcriptFormat: '<String>', transcriptVersion: '<Int>', visibility: '<String>' });
```
