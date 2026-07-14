# platformFunctionInvocation

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Function invocation log — INSERT to call a function (business-layer, metered). Linked to definitions via function_definition_id FK, with task_identifier as the denormalized routing/audit slug.

## Usage

```typescript
usePlatformFunctionInvocationsQuery({ selection: { fields: { actorId: true, apiBindingId: true, completedAt: true, createdAt: true, durationMs: true, error: true, functionDefinitionId: true, graphExecutionId: true, id: true, jobId: true, parentInvocationId: true, payload: true, result: true, startedAt: true, status: true, taskIdentifier: true } } })
usePlatformFunctionInvocationQuery({ id: '<UUID>', selection: { fields: { actorId: true, apiBindingId: true, completedAt: true, createdAt: true, durationMs: true, error: true, functionDefinitionId: true, graphExecutionId: true, id: true, jobId: true, parentInvocationId: true, payload: true, result: true, startedAt: true, status: true, taskIdentifier: true } } })
useCreatePlatformFunctionInvocationMutation({ selection: { fields: { id: true } } })
useUpdatePlatformFunctionInvocationMutation({ selection: { fields: { id: true } } })
useDeletePlatformFunctionInvocationMutation({})
```

## Examples

### List all platformFunctionInvocations

```typescript
const { data, isLoading } = usePlatformFunctionInvocationsQuery({
  selection: { fields: { actorId: true, apiBindingId: true, completedAt: true, createdAt: true, durationMs: true, error: true, functionDefinitionId: true, graphExecutionId: true, id: true, jobId: true, parentInvocationId: true, payload: true, result: true, startedAt: true, status: true, taskIdentifier: true } },
});
```

### Create a platformFunctionInvocation

```typescript
const { mutate } = useCreatePlatformFunctionInvocationMutation({
  selection: { fields: { id: true } },
});
mutate({ actorId: '<UUID>', apiBindingId: '<UUID>', completedAt: '<Datetime>', durationMs: '<Int>', error: '<String>', functionDefinitionId: '<UUID>', graphExecutionId: '<UUID>', jobId: '<BigInt>', parentInvocationId: '<UUID>', payload: '<JSON>', result: '<JSON>', startedAt: '<Datetime>', status: '<String>', taskIdentifier: '<String>' });
```
