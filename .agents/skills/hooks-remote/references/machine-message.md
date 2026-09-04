# machineMessage

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Partitioned append-only ledger of session input, output and lifecycle

## Usage

```typescript
useMachineMessagesQuery({ selection: { fields: { actorId: true, content: true, createdByPrincipal: true, entityId: true, id: true, kind: true, ownerId: true, recordedAt: true, seq: true, sessionId: true } } })
useMachineMessageQuery({ id: '<UUID>', selection: { fields: { actorId: true, content: true, createdByPrincipal: true, entityId: true, id: true, kind: true, ownerId: true, recordedAt: true, seq: true, sessionId: true } } })
useCreateMachineMessageMutation({ selection: { fields: { id: true } } })
useUpdateMachineMessageMutation({ selection: { fields: { id: true } } })
useDeleteMachineMessageMutation({})
```

## Examples

### List all machineMessages

```typescript
const { data, isLoading } = useMachineMessagesQuery({
  selection: { fields: { actorId: true, content: true, createdByPrincipal: true, entityId: true, id: true, kind: true, ownerId: true, recordedAt: true, seq: true, sessionId: true } },
});
```

### Create a machineMessage

```typescript
const { mutate } = useCreateMachineMessageMutation({
  selection: { fields: { id: true } },
});
mutate({ actorId: '<UUID>', content: '<JSON>', createdByPrincipal: '<UUID>', entityId: '<UUID>', kind: '<String>', ownerId: '<UUID>', recordedAt: '<Datetime>', seq: '<BigInt>', sessionId: '<UUID>' });
```
