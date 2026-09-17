# agentEvent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Append-only transcript of an agent run: one agent session entry per row, stored verbatim

## Usage

```typescript
useAgentEventsQuery({ selection: { fields: { actorId: true, createdAt: true, databaseId: true, entry: true, id: true, recordedAt: true, runId: true, seq: true, transcriptFormat: true, transcriptVersion: true, updatedAt: true, visibility: true } } })
useAgentEventQuery({ id: '<UUID>', selection: { fields: { actorId: true, createdAt: true, databaseId: true, entry: true, id: true, recordedAt: true, runId: true, seq: true, transcriptFormat: true, transcriptVersion: true, updatedAt: true, visibility: true } } })
useCreateAgentEventMutation({ selection: { fields: { id: true } } })
useUpdateAgentEventMutation({ selection: { fields: { id: true } } })
useDeleteAgentEventMutation({})
```

## Examples

### List all agentEvents

```typescript
const { data, isLoading } = useAgentEventsQuery({
  selection: { fields: { actorId: true, createdAt: true, databaseId: true, entry: true, id: true, recordedAt: true, runId: true, seq: true, transcriptFormat: true, transcriptVersion: true, updatedAt: true, visibility: true } },
});
```

### Create a agentEvent

```typescript
const { mutate } = useCreateAgentEventMutation({
  selection: { fields: { id: true } },
});
mutate({ actorId: '<UUID>', databaseId: '<UUID>', entry: '<JSON>', recordedAt: '<Datetime>', runId: '<UUID>', seq: '<Int>', transcriptFormat: '<String>', transcriptVersion: '<Int>', visibility: '<String>' });
```
