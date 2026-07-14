# platformFunctionExecutionLog

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Function execution logs — structured console output per invocation

## Usage

```typescript
db.platformFunctionExecutionLog.findMany({ select: { id: true } }).execute()
db.platformFunctionExecutionLog.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformFunctionExecutionLog.create({ data: { actorId: '<UUID>', invocationId: '<UUID>', logLevel: '<String>', message: '<String>', metadata: '<JSON>', taskIdentifier: '<String>' }, select: { id: true } }).execute()
db.platformFunctionExecutionLog.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute()
db.platformFunctionExecutionLog.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformFunctionExecutionLog records

```typescript
const items = await db.platformFunctionExecutionLog.findMany({
  select: { id: true, actorId: true }
}).execute();
```

### Create a platformFunctionExecutionLog

```typescript
const item = await db.platformFunctionExecutionLog.create({
  data: { actorId: '<UUID>', invocationId: '<UUID>', logLevel: '<String>', message: '<String>', metadata: '<JSON>', taskIdentifier: '<String>' },
  select: { id: true }
}).execute();
```
