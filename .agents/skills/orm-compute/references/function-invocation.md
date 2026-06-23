# functionInvocation

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Function invocation log — INSERT to call a function (business-layer, metered). Linked to definitions by task_identifier string.

## Usage

```typescript
db.functionInvocation.findMany({ select: { id: true } }).execute()
db.functionInvocation.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.functionInvocation.create({ data: { actorId: '<UUID>', databaseId: '<UUID>', taskIdentifier: '<String>', payload: '<JSON>', status: '<String>', result: '<JSON>', error: '<String>', durationMs: '<Int>', jobId: '<BigInt>', startedAt: '<Datetime>', completedAt: '<Datetime>', parentInvocationId: '<UUID>', graphExecutionId: '<UUID>' }, select: { id: true } }).execute()
db.functionInvocation.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute()
db.functionInvocation.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all functionInvocation records

```typescript
const items = await db.functionInvocation.findMany({
  select: { id: true, actorId: true }
}).execute();
```

### Create a functionInvocation

```typescript
const item = await db.functionInvocation.create({
  data: { actorId: '<UUID>', databaseId: '<UUID>', taskIdentifier: '<String>', payload: '<JSON>', status: '<String>', result: '<JSON>', error: '<String>', durationMs: '<Int>', jobId: '<BigInt>', startedAt: '<Datetime>', completedAt: '<Datetime>', parentInvocationId: '<UUID>', graphExecutionId: '<UUID>' },
  select: { id: true }
}).execute();
```
