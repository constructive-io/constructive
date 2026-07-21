# platformFunctionInvocationAttempt

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Function invocation attempts — one row per worker attempt (including failed retries) with duration and error detail

## Usage

```typescript
db.platformFunctionInvocationAttempt.findMany({ select: { id: true } }).execute()
db.platformFunctionInvocationAttempt.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformFunctionInvocationAttempt.create({ data: { actorId: '<UUID>', attempt: '<Int>', durationMs: '<Int>', error: '<String>', errorDetail: '<JSON>', invocationCreatedAt: '<Datetime>', invocationId: '<UUID>', startedAt: '<Datetime>', success: '<Boolean>', taskIdentifier: '<String>' }, select: { id: true } }).execute()
db.platformFunctionInvocationAttempt.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute()
db.platformFunctionInvocationAttempt.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformFunctionInvocationAttempt records

```typescript
const items = await db.platformFunctionInvocationAttempt.findMany({
  select: { id: true, actorId: true }
}).execute();
```

### Create a platformFunctionInvocationAttempt

```typescript
const item = await db.platformFunctionInvocationAttempt.create({
  data: { actorId: '<UUID>', attempt: '<Int>', durationMs: '<Int>', error: '<String>', errorDetail: '<JSON>', invocationCreatedAt: '<Datetime>', invocationId: '<UUID>', startedAt: '<Datetime>', success: '<Boolean>', taskIdentifier: '<String>' },
  select: { id: true }
}).execute();
```
