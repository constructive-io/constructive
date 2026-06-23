# functionExecutionLog

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Function execution logs — structured console output per invocation

## Usage

```typescript
useFunctionExecutionLogsQuery({ selection: { fields: { createdAt: true, id: true, invocationId: true, taskIdentifier: true, logLevel: true, message: true, metadata: true, actorId: true, databaseId: true } } })
useFunctionExecutionLogQuery({ id: '<UUID>', selection: { fields: { createdAt: true, id: true, invocationId: true, taskIdentifier: true, logLevel: true, message: true, metadata: true, actorId: true, databaseId: true } } })
useCreateFunctionExecutionLogMutation({ selection: { fields: { id: true } } })
useUpdateFunctionExecutionLogMutation({ selection: { fields: { id: true } } })
useDeleteFunctionExecutionLogMutation({})
```

## Examples

### List all functionExecutionLogs

```typescript
const { data, isLoading } = useFunctionExecutionLogsQuery({
  selection: { fields: { createdAt: true, id: true, invocationId: true, taskIdentifier: true, logLevel: true, message: true, metadata: true, actorId: true, databaseId: true } },
});
```

### Create a functionExecutionLog

```typescript
const { mutate } = useCreateFunctionExecutionLogMutation({
  selection: { fields: { id: true } },
});
mutate({ invocationId: '<UUID>', taskIdentifier: '<String>', logLevel: '<String>', message: '<String>', metadata: '<JSON>', actorId: '<UUID>', databaseId: '<UUID>' });
```
