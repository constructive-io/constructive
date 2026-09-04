# machineSession

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Command or terminal sessions running on an enrolled machine

## Usage

```typescript
db.machineSession.findMany({ select: { id: true } }).execute()
db.machineSession.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.machineSession.create({ data: { agentMode: '<String>', agentSessionRef: '<String>', args: '<String>', cols: '<Int>', command: '<String>', createdBy: '<UUID>', createdByPrincipal: '<UUID>', cwd: '<String>', endedAt: '<Datetime>', entityId: '<UUID>', env: '<JSON>', exitCode: '<Int>', interactive: '<Boolean>', lastActivityAt: '<Datetime>', lastSeq: '<BigInt>', machineId: '<UUID>', metadata: '<JSON>', ownerId: '<UUID>', pid: '<Int>', runId: '<UUID>', startedAt: '<Datetime>', state: '<String>', termRows: '<Int>', updatedBy: '<UUID>', updatedByPrincipal: '<UUID>' }, select: { id: true } }).execute()
db.machineSession.update({ where: { id: '<UUID>' }, data: { agentMode: '<String>' }, select: { id: true } }).execute()
db.machineSession.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all machineSession records

```typescript
const items = await db.machineSession.findMany({
  select: { id: true, agentMode: true }
}).execute();
```

### Create a machineSession

```typescript
const item = await db.machineSession.create({
  data: { agentMode: '<String>', agentSessionRef: '<String>', args: '<String>', cols: '<Int>', command: '<String>', createdBy: '<UUID>', createdByPrincipal: '<UUID>', cwd: '<String>', endedAt: '<Datetime>', entityId: '<UUID>', env: '<JSON>', exitCode: '<Int>', interactive: '<Boolean>', lastActivityAt: '<Datetime>', lastSeq: '<BigInt>', machineId: '<UUID>', metadata: '<JSON>', ownerId: '<UUID>', pid: '<Int>', runId: '<UUID>', startedAt: '<Datetime>', state: '<String>', termRows: '<Int>', updatedBy: '<UUID>', updatedByPrincipal: '<UUID>' },
  select: { id: true }
}).execute();
```
