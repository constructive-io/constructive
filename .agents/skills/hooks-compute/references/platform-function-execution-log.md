# platformFunctionExecutionLog

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Function execution logs — structured console output per invocation

## Usage

```typescript
usePlatformFunctionExecutionLogsQuery({ selection: { fields: { createdAt: true, id: true, invocationId: true, taskIdentifier: true, logLevel: true, message: true, metadata: true, actorId: true } } })
usePlatformFunctionExecutionLogQuery({ id: '<UUID>', selection: { fields: { createdAt: true, id: true, invocationId: true, taskIdentifier: true, logLevel: true, message: true, metadata: true, actorId: true } } })
useCreatePlatformFunctionExecutionLogMutation({ selection: { fields: { id: true } } })
useUpdatePlatformFunctionExecutionLogMutation({ selection: { fields: { id: true } } })
useDeletePlatformFunctionExecutionLogMutation({})
```

## Examples

### List all platformFunctionExecutionLogs

```typescript
const { data, isLoading } = usePlatformFunctionExecutionLogsQuery({
  selection: { fields: { createdAt: true, id: true, invocationId: true, taskIdentifier: true, logLevel: true, message: true, metadata: true, actorId: true } },
});
```

### Create a platformFunctionExecutionLog

```typescript
const { mutate } = useCreatePlatformFunctionExecutionLogMutation({
  selection: { fields: { id: true } },
});
mutate({ invocationId: '<UUID>', taskIdentifier: '<String>', logLevel: '<String>', message: '<String>', metadata: '<JSON>', actorId: '<UUID>' });
```
