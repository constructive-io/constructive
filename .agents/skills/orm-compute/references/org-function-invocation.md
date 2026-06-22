# orgFunctionInvocation

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Function invocation log — INSERT to call a function (business-layer, metered). Linked to definitions by task_identifier string.

## Usage

```typescript
db.orgFunctionInvocation.findMany({ select: { id: true } }).execute()
db.orgFunctionInvocation.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.orgFunctionInvocation.create({ data: { actorId: '<UUID>', taskIdentifier: '<String>', payload: '<JSON>', status: '<String>', result: '<JSON>', error: '<String>', durationMs: '<Int>', jobId: '<BigInt>', startedAt: '<Datetime>', completedAt: '<Datetime>', parentInvocationId: '<UUID>', graphExecutionId: '<UUID>' }, select: { id: true } }).execute()
db.orgFunctionInvocation.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute()
db.orgFunctionInvocation.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all orgFunctionInvocation records

```typescript
const items = await db.orgFunctionInvocation.findMany({
  select: { id: true, actorId: true }
}).execute();
```

### Create a orgFunctionInvocation

```typescript
const item = await db.orgFunctionInvocation.create({
  data: { actorId: '<UUID>', taskIdentifier: '<String>', payload: '<JSON>', status: '<String>', result: '<JSON>', error: '<String>', durationMs: '<Int>', jobId: '<BigInt>', startedAt: '<Datetime>', completedAt: '<Datetime>', parentInvocationId: '<UUID>', graphExecutionId: '<UUID>' },
  select: { id: true }
}).execute();
```
