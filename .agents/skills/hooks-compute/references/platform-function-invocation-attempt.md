# platformFunctionInvocationAttempt

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Function invocation attempts — one row per worker attempt (including failed retries) with duration and error detail

## Usage

```typescript
usePlatformFunctionInvocationAttemptsQuery({ selection: { fields: { actorId: true, attempt: true, createdAt: true, durationMs: true, error: true, errorDetail: true, id: true, invocationCreatedAt: true, invocationId: true, startedAt: true, success: true, taskIdentifier: true } } })
usePlatformFunctionInvocationAttemptQuery({ id: '<UUID>', selection: { fields: { actorId: true, attempt: true, createdAt: true, durationMs: true, error: true, errorDetail: true, id: true, invocationCreatedAt: true, invocationId: true, startedAt: true, success: true, taskIdentifier: true } } })
useCreatePlatformFunctionInvocationAttemptMutation({ selection: { fields: { id: true } } })
useUpdatePlatformFunctionInvocationAttemptMutation({ selection: { fields: { id: true } } })
useDeletePlatformFunctionInvocationAttemptMutation({})
```

## Examples

### List all platformFunctionInvocationAttempts

```typescript
const { data, isLoading } = usePlatformFunctionInvocationAttemptsQuery({
  selection: { fields: { actorId: true, attempt: true, createdAt: true, durationMs: true, error: true, errorDetail: true, id: true, invocationCreatedAt: true, invocationId: true, startedAt: true, success: true, taskIdentifier: true } },
});
```

### Create a platformFunctionInvocationAttempt

```typescript
const { mutate } = useCreatePlatformFunctionInvocationAttemptMutation({
  selection: { fields: { id: true } },
});
mutate({ actorId: '<UUID>', attempt: '<Int>', durationMs: '<Int>', error: '<String>', errorDetail: '<JSON>', invocationCreatedAt: '<Datetime>', invocationId: '<UUID>', startedAt: '<Datetime>', success: '<Boolean>', taskIdentifier: '<String>' });
```
