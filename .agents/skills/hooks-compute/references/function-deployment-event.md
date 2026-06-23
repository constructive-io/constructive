# functionDeploymentEvent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Deployment lifecycle events — audit log of provisioning, scaling, and failure events

## Usage

```typescript
useFunctionDeploymentEventsQuery({ selection: { fields: { createdAt: true, id: true, deploymentId: true, eventType: true, actorId: true, message: true, metadata: true, databaseId: true } } })
useFunctionDeploymentEventQuery({ id: '<UUID>', selection: { fields: { createdAt: true, id: true, deploymentId: true, eventType: true, actorId: true, message: true, metadata: true, databaseId: true } } })
useCreateFunctionDeploymentEventMutation({ selection: { fields: { id: true } } })
useUpdateFunctionDeploymentEventMutation({ selection: { fields: { id: true } } })
useDeleteFunctionDeploymentEventMutation({})
```

## Examples

### List all functionDeploymentEvents

```typescript
const { data, isLoading } = useFunctionDeploymentEventsQuery({
  selection: { fields: { createdAt: true, id: true, deploymentId: true, eventType: true, actorId: true, message: true, metadata: true, databaseId: true } },
});
```

### Create a functionDeploymentEvent

```typescript
const { mutate } = useCreateFunctionDeploymentEventMutation({
  selection: { fields: { id: true } },
});
mutate({ deploymentId: '<UUID>', eventType: '<String>', actorId: '<UUID>', message: '<String>', metadata: '<JSON>', databaseId: '<UUID>' });
```
