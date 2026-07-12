# platformFunctionDeploymentEvent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Deployment lifecycle events — audit log of provisioning, scaling, and failure events

## Usage

```typescript
usePlatformFunctionDeploymentEventsQuery({ selection: { fields: { createdAt: true, id: true, deploymentId: true, eventType: true, actorId: true, message: true, metadata: true } } })
usePlatformFunctionDeploymentEventQuery({ id: '<UUID>', selection: { fields: { createdAt: true, id: true, deploymentId: true, eventType: true, actorId: true, message: true, metadata: true } } })
useCreatePlatformFunctionDeploymentEventMutation({ selection: { fields: { id: true } } })
useUpdatePlatformFunctionDeploymentEventMutation({ selection: { fields: { id: true } } })
useDeletePlatformFunctionDeploymentEventMutation({})
```

## Examples

### List all platformFunctionDeploymentEvents

```typescript
const { data, isLoading } = usePlatformFunctionDeploymentEventsQuery({
  selection: { fields: { createdAt: true, id: true, deploymentId: true, eventType: true, actorId: true, message: true, metadata: true } },
});
```

### Create a platformFunctionDeploymentEvent

```typescript
const { mutate } = useCreatePlatformFunctionDeploymentEventMutation({
  selection: { fields: { id: true } },
});
mutate({ deploymentId: '<UUID>', eventType: '<String>', actorId: '<UUID>', message: '<String>', metadata: '<JSON>' });
```
