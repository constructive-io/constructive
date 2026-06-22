# functionInvocation

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Function invocation log — INSERT to call a function (business-layer, metered). Linked to definitions by task_identifier string.

## Usage

```typescript
useFunctionInvocationsQuery({ selection: { fields: { createdAt: true, id: true, actorId: true, databaseId: true, taskIdentifier: true, payload: true, status: true, result: true, error: true, durationMs: true, jobId: true, startedAt: true, completedAt: true, parentInvocationId: true, graphExecutionId: true } } })
useFunctionInvocationQuery({ id: '<UUID>', selection: { fields: { createdAt: true, id: true, actorId: true, databaseId: true, taskIdentifier: true, payload: true, status: true, result: true, error: true, durationMs: true, jobId: true, startedAt: true, completedAt: true, parentInvocationId: true, graphExecutionId: true } } })
useCreateFunctionInvocationMutation({ selection: { fields: { id: true } } })
useUpdateFunctionInvocationMutation({ selection: { fields: { id: true } } })
useDeleteFunctionInvocationMutation({})
```

## Examples

### List all functionInvocations

```typescript
const { data, isLoading } = useFunctionInvocationsQuery({
  selection: { fields: { createdAt: true, id: true, actorId: true, databaseId: true, taskIdentifier: true, payload: true, status: true, result: true, error: true, durationMs: true, jobId: true, startedAt: true, completedAt: true, parentInvocationId: true, graphExecutionId: true } },
});
```

### Create a functionInvocation

```typescript
const { mutate } = useCreateFunctionInvocationMutation({
  selection: { fields: { id: true } },
});
mutate({ actorId: '<UUID>', databaseId: '<UUID>', taskIdentifier: '<String>', payload: '<JSON>', status: '<String>', result: '<JSON>', error: '<String>', durationMs: '<Int>', jobId: '<BigInt>', startedAt: '<Datetime>', completedAt: '<Datetime>', parentInvocationId: '<UUID>', graphExecutionId: '<UUID>' });
```
