# machineSession

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Command or terminal sessions running on an enrolled machine

## Usage

```typescript
useMachineSessionsQuery({ selection: { fields: { agentMode: true, agentSessionRef: true, args: true, cols: true, command: true, createdAt: true, createdBy: true, createdByPrincipal: true, cwd: true, endedAt: true, entityId: true, env: true, exitCode: true, id: true, interactive: true, lastActivityAt: true, lastSeq: true, machineId: true, metadata: true, ownerId: true, pid: true, runId: true, startedAt: true, state: true, termRows: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } } })
useMachineSessionQuery({ id: '<UUID>', selection: { fields: { agentMode: true, agentSessionRef: true, args: true, cols: true, command: true, createdAt: true, createdBy: true, createdByPrincipal: true, cwd: true, endedAt: true, entityId: true, env: true, exitCode: true, id: true, interactive: true, lastActivityAt: true, lastSeq: true, machineId: true, metadata: true, ownerId: true, pid: true, runId: true, startedAt: true, state: true, termRows: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } } })
useCreateMachineSessionMutation({ selection: { fields: { id: true } } })
useUpdateMachineSessionMutation({ selection: { fields: { id: true } } })
useDeleteMachineSessionMutation({})
```

## Examples

### List all machineSessions

```typescript
const { data, isLoading } = useMachineSessionsQuery({
  selection: { fields: { agentMode: true, agentSessionRef: true, args: true, cols: true, command: true, createdAt: true, createdBy: true, createdByPrincipal: true, cwd: true, endedAt: true, entityId: true, env: true, exitCode: true, id: true, interactive: true, lastActivityAt: true, lastSeq: true, machineId: true, metadata: true, ownerId: true, pid: true, runId: true, startedAt: true, state: true, termRows: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } },
});
```

### Create a machineSession

```typescript
const { mutate } = useCreateMachineSessionMutation({
  selection: { fields: { id: true } },
});
mutate({ agentMode: '<String>', agentSessionRef: '<String>', args: '<String>', cols: '<Int>', command: '<String>', createdBy: '<UUID>', createdByPrincipal: '<UUID>', cwd: '<String>', endedAt: '<Datetime>', entityId: '<UUID>', env: '<JSON>', exitCode: '<Int>', interactive: '<Boolean>', lastActivityAt: '<Datetime>', lastSeq: '<BigInt>', machineId: '<UUID>', metadata: '<JSON>', ownerId: '<UUID>', pid: '<Int>', runId: '<UUID>', startedAt: '<Datetime>', state: '<String>', termRows: '<Int>', updatedBy: '<UUID>', updatedByPrincipal: '<UUID>' });
```
