# functionInvocation

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Function invocation log — INSERT to call a function (business-layer, metered). Linked to definitions via function_definition_id FK, with task_identifier as the denormalized routing/audit slug.

## Usage

```typescript
useFunctionInvocationsQuery({ selection: { fields: { actorId: true, apiBindingId: true, channel: true, completedAt: true, createdAt: true, databaseId: true, definitionScope: true, durationMs: true, error: true, functionDefinitionId: true, graphExecutionId: true, id: true, jobId: true, parentInvocationId: true, payload: true, provenance: true, result: true, startedAt: true, status: true, taskIdentifier: true } } })
useFunctionInvocationQuery({ id: '<UUID>', selection: { fields: { actorId: true, apiBindingId: true, channel: true, completedAt: true, createdAt: true, databaseId: true, definitionScope: true, durationMs: true, error: true, functionDefinitionId: true, graphExecutionId: true, id: true, jobId: true, parentInvocationId: true, payload: true, provenance: true, result: true, startedAt: true, status: true, taskIdentifier: true } } })
useCreateFunctionInvocationMutation({ selection: { fields: { id: true } } })
useUpdateFunctionInvocationMutation({ selection: { fields: { id: true } } })
useDeleteFunctionInvocationMutation({})
```

## Examples

### List all functionInvocations

```typescript
const { data, isLoading } = useFunctionInvocationsQuery({
  selection: { fields: { actorId: true, apiBindingId: true, channel: true, completedAt: true, createdAt: true, databaseId: true, definitionScope: true, durationMs: true, error: true, functionDefinitionId: true, graphExecutionId: true, id: true, jobId: true, parentInvocationId: true, payload: true, provenance: true, result: true, startedAt: true, status: true, taskIdentifier: true } },
});
```

### Create a functionInvocation

```typescript
const { mutate } = useCreateFunctionInvocationMutation({
  selection: { fields: { id: true } },
});
mutate({ actorId: '<UUID>', apiBindingId: '<UUID>', channel: '<String>', completedAt: '<Datetime>', databaseId: '<UUID>', definitionScope: '<String>', durationMs: '<Int>', error: '<String>', functionDefinitionId: '<UUID>', graphExecutionId: '<UUID>', jobId: '<BigInt>', parentInvocationId: '<UUID>', payload: '<JSON>', provenance: '<JSON>', result: '<JSON>', startedAt: '<Datetime>', status: '<String>', taskIdentifier: '<String>' });
```
