# functionExecutionLog

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Function execution logs — structured console output per invocation

## Usage

```typescript
useFunctionExecutionLogsQuery({ selection: { fields: { actorId: true, createdAt: true, databaseId: true, id: true, invocationId: true, logLevel: true, message: true, metadata: true, taskIdentifier: true } } })
useFunctionExecutionLogQuery({ id: '<UUID>', selection: { fields: { actorId: true, createdAt: true, databaseId: true, id: true, invocationId: true, logLevel: true, message: true, metadata: true, taskIdentifier: true } } })
useCreateFunctionExecutionLogMutation({ selection: { fields: { id: true } } })
useUpdateFunctionExecutionLogMutation({ selection: { fields: { id: true } } })
useDeleteFunctionExecutionLogMutation({})
```

## Examples

### List all functionExecutionLogs

```typescript
const { data, isLoading } = useFunctionExecutionLogsQuery({
  selection: { fields: { actorId: true, createdAt: true, databaseId: true, id: true, invocationId: true, logLevel: true, message: true, metadata: true, taskIdentifier: true } },
});
```

### Create a functionExecutionLog

```typescript
const { mutate } = useCreateFunctionExecutionLogMutation({
  selection: { fields: { id: true } },
});
mutate({ actorId: '<UUID>', databaseId: '<UUID>', invocationId: '<UUID>', logLevel: '<String>', message: '<String>', metadata: '<JSON>', taskIdentifier: '<String>' });
```
