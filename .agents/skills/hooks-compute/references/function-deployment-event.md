# functionDeploymentEvent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Deployment lifecycle events — audit log of provisioning, scaling, and failure events

## Usage

```typescript
useFunctionDeploymentEventsQuery({ selection: { fields: { actorId: true, createdAt: true, databaseId: true, deploymentId: true, eventType: true, id: true, message: true, metadata: true } } })
useFunctionDeploymentEventQuery({ id: '<UUID>', selection: { fields: { actorId: true, createdAt: true, databaseId: true, deploymentId: true, eventType: true, id: true, message: true, metadata: true } } })
useCreateFunctionDeploymentEventMutation({ selection: { fields: { id: true } } })
useUpdateFunctionDeploymentEventMutation({ selection: { fields: { id: true } } })
useDeleteFunctionDeploymentEventMutation({})
```

## Examples

### List all functionDeploymentEvents

```typescript
const { data, isLoading } = useFunctionDeploymentEventsQuery({
  selection: { fields: { actorId: true, createdAt: true, databaseId: true, deploymentId: true, eventType: true, id: true, message: true, metadata: true } },
});
```

### Create a functionDeploymentEvent

```typescript
const { mutate } = useCreateFunctionDeploymentEventMutation({
  selection: { fields: { id: true } },
});
mutate({ actorId: '<UUID>', databaseId: '<UUID>', deploymentId: '<UUID>', eventType: '<String>', message: '<String>', metadata: '<JSON>' });
```
