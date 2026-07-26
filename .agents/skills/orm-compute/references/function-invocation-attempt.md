# functionInvocationAttempt

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Function invocation attempts — one row per worker attempt (including failed retries) with duration and error detail

## Usage

```typescript
db.functionInvocationAttempt.findMany({ select: { id: true } }).execute()
db.functionInvocationAttempt.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.functionInvocationAttempt.create({ data: { actorId: '<UUID>', attempt: '<Int>', databaseId: '<UUID>', durationMs: '<Int>', error: '<String>', errorDetail: '<JSON>', invocationCreatedAt: '<Datetime>', invocationId: '<UUID>', startedAt: '<Datetime>', success: '<Boolean>', taskIdentifier: '<String>' }, select: { id: true } }).execute()
db.functionInvocationAttempt.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute()
db.functionInvocationAttempt.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all functionInvocationAttempt records

```typescript
const items = await db.functionInvocationAttempt.findMany({
  select: { id: true, actorId: true }
}).execute();
```

### Create a functionInvocationAttempt

```typescript
const item = await db.functionInvocationAttempt.create({
  data: { actorId: '<UUID>', attempt: '<Int>', databaseId: '<UUID>', durationMs: '<Int>', error: '<String>', errorDetail: '<JSON>', invocationCreatedAt: '<Datetime>', invocationId: '<UUID>', startedAt: '<Datetime>', success: '<Boolean>', taskIdentifier: '<String>' },
  select: { id: true }
}).execute();
```
