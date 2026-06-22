# orgFunctionExecutionLog

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Function execution logs — structured console output per invocation

## Usage

```typescript
useOrgFunctionExecutionLogsQuery({ selection: { fields: { createdAt: true, id: true, invocationId: true, taskIdentifier: true, logLevel: true, message: true, metadata: true, actorId: true } } })
useOrgFunctionExecutionLogQuery({ id: '<UUID>', selection: { fields: { createdAt: true, id: true, invocationId: true, taskIdentifier: true, logLevel: true, message: true, metadata: true, actorId: true } } })
useCreateOrgFunctionExecutionLogMutation({ selection: { fields: { id: true } } })
useUpdateOrgFunctionExecutionLogMutation({ selection: { fields: { id: true } } })
useDeleteOrgFunctionExecutionLogMutation({})
```

## Examples

### List all orgFunctionExecutionLogs

```typescript
const { data, isLoading } = useOrgFunctionExecutionLogsQuery({
  selection: { fields: { createdAt: true, id: true, invocationId: true, taskIdentifier: true, logLevel: true, message: true, metadata: true, actorId: true } },
});
```

### Create a orgFunctionExecutionLog

```typescript
const { mutate } = useCreateOrgFunctionExecutionLogMutation({
  selection: { fields: { id: true } },
});
mutate({ invocationId: '<UUID>', taskIdentifier: '<String>', logLevel: '<String>', message: '<String>', metadata: '<JSON>', actorId: '<UUID>' });
```
