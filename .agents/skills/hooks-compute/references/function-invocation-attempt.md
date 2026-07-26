# functionInvocationAttempt

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Function invocation attempts — one row per worker attempt (including failed retries) with duration and error detail

## Usage

```typescript
useFunctionInvocationAttemptsQuery({ selection: { fields: { actorId: true, attempt: true, createdAt: true, databaseId: true, durationMs: true, error: true, errorDetail: true, id: true, invocationCreatedAt: true, invocationId: true, startedAt: true, success: true, taskIdentifier: true } } })
useFunctionInvocationAttemptQuery({ id: '<UUID>', selection: { fields: { actorId: true, attempt: true, createdAt: true, databaseId: true, durationMs: true, error: true, errorDetail: true, id: true, invocationCreatedAt: true, invocationId: true, startedAt: true, success: true, taskIdentifier: true } } })
useCreateFunctionInvocationAttemptMutation({ selection: { fields: { id: true } } })
useUpdateFunctionInvocationAttemptMutation({ selection: { fields: { id: true } } })
useDeleteFunctionInvocationAttemptMutation({})
```

## Examples

### List all functionInvocationAttempts

```typescript
const { data, isLoading } = useFunctionInvocationAttemptsQuery({
  selection: { fields: { actorId: true, attempt: true, createdAt: true, databaseId: true, durationMs: true, error: true, errorDetail: true, id: true, invocationCreatedAt: true, invocationId: true, startedAt: true, success: true, taskIdentifier: true } },
});
```

### Create a functionInvocationAttempt

```typescript
const { mutate } = useCreateFunctionInvocationAttemptMutation({
  selection: { fields: { id: true } },
});
mutate({ actorId: '<UUID>', attempt: '<Int>', databaseId: '<UUID>', durationMs: '<Int>', error: '<String>', errorDetail: '<JSON>', invocationCreatedAt: '<Datetime>', invocationId: '<UUID>', startedAt: '<Datetime>', success: '<Boolean>', taskIdentifier: '<String>' });
```
