# platformFunctionInvocation

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Function invocation log — INSERT to call a function (business-layer, metered). Linked to definitions by task_identifier string.

## Usage

```typescript
usePlatformFunctionInvocationsQuery({ selection: { fields: { createdAt: true, id: true, actorId: true, taskIdentifier: true, payload: true, status: true, result: true, error: true, durationMs: true, jobId: true, startedAt: true, completedAt: true, parentInvocationId: true, graphExecutionId: true } } })
usePlatformFunctionInvocationQuery({ id: '<UUID>', selection: { fields: { createdAt: true, id: true, actorId: true, taskIdentifier: true, payload: true, status: true, result: true, error: true, durationMs: true, jobId: true, startedAt: true, completedAt: true, parentInvocationId: true, graphExecutionId: true } } })
useCreatePlatformFunctionInvocationMutation({ selection: { fields: { id: true } } })
useUpdatePlatformFunctionInvocationMutation({ selection: { fields: { id: true } } })
useDeletePlatformFunctionInvocationMutation({})
```

## Examples

### List all platformFunctionInvocations

```typescript
const { data, isLoading } = usePlatformFunctionInvocationsQuery({
  selection: { fields: { createdAt: true, id: true, actorId: true, taskIdentifier: true, payload: true, status: true, result: true, error: true, durationMs: true, jobId: true, startedAt: true, completedAt: true, parentInvocationId: true, graphExecutionId: true } },
});
```

### Create a platformFunctionInvocation

```typescript
const { mutate } = useCreatePlatformFunctionInvocationMutation({
  selection: { fields: { id: true } },
});
mutate({ actorId: '<UUID>', taskIdentifier: '<String>', payload: '<JSON>', status: '<String>', result: '<JSON>', error: '<String>', durationMs: '<Int>', jobId: '<BigInt>', startedAt: '<Datetime>', completedAt: '<Datetime>', parentInvocationId: '<UUID>', graphExecutionId: '<UUID>' });
```
