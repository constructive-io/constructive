# orgFunctionInvocation

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Function invocation log — INSERT to call a function (business-layer, metered). Linked to definitions by task_identifier string.

## Usage

```typescript
useOrgFunctionInvocationsQuery({ selection: { fields: { createdAt: true, id: true, actorId: true, taskIdentifier: true, payload: true, status: true, result: true, error: true, durationMs: true, jobId: true, startedAt: true, completedAt: true, parentInvocationId: true, graphExecutionId: true } } })
useOrgFunctionInvocationQuery({ id: '<UUID>', selection: { fields: { createdAt: true, id: true, actorId: true, taskIdentifier: true, payload: true, status: true, result: true, error: true, durationMs: true, jobId: true, startedAt: true, completedAt: true, parentInvocationId: true, graphExecutionId: true } } })
useCreateOrgFunctionInvocationMutation({ selection: { fields: { id: true } } })
useUpdateOrgFunctionInvocationMutation({ selection: { fields: { id: true } } })
useDeleteOrgFunctionInvocationMutation({})
```

## Examples

### List all orgFunctionInvocations

```typescript
const { data, isLoading } = useOrgFunctionInvocationsQuery({
  selection: { fields: { createdAt: true, id: true, actorId: true, taskIdentifier: true, payload: true, status: true, result: true, error: true, durationMs: true, jobId: true, startedAt: true, completedAt: true, parentInvocationId: true, graphExecutionId: true } },
});
```

### Create a orgFunctionInvocation

```typescript
const { mutate } = useCreateOrgFunctionInvocationMutation({
  selection: { fields: { id: true } },
});
mutate({ actorId: '<UUID>', taskIdentifier: '<String>', payload: '<JSON>', status: '<String>', result: '<JSON>', error: '<String>', durationMs: '<Int>', jobId: '<BigInt>', startedAt: '<Datetime>', completedAt: '<Datetime>', parentInvocationId: '<UUID>', graphExecutionId: '<UUID>' });
```
