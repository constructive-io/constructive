# functionExecutionLog

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Function execution logs — structured console output per invocation

## Usage

```typescript
db.functionExecutionLog.findMany({ select: { id: true } }).execute()
db.functionExecutionLog.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.functionExecutionLog.create({ data: { actorId: '<UUID>', databaseId: '<UUID>', invocationId: '<UUID>', logLevel: '<String>', message: '<String>', metadata: '<JSON>', taskIdentifier: '<String>' }, select: { id: true } }).execute()
db.functionExecutionLog.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute()
db.functionExecutionLog.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all functionExecutionLog records

```typescript
const items = await db.functionExecutionLog.findMany({
  select: { id: true, actorId: true }
}).execute();
```

### Create a functionExecutionLog

```typescript
const item = await db.functionExecutionLog.create({
  data: { actorId: '<UUID>', databaseId: '<UUID>', invocationId: '<UUID>', logLevel: '<String>', message: '<String>', metadata: '<JSON>', taskIdentifier: '<String>' },
  select: { id: true }
}).execute();
```
