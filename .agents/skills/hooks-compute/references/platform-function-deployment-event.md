# platformFunctionDeploymentEvent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Deployment lifecycle events — audit log of provisioning, scaling, and failure events

## Usage

```typescript
usePlatformFunctionDeploymentEventsQuery({ selection: { fields: { actorId: true, createdAt: true, deploymentId: true, eventType: true, id: true, message: true, metadata: true } } })
usePlatformFunctionDeploymentEventQuery({ id: '<UUID>', selection: { fields: { actorId: true, createdAt: true, deploymentId: true, eventType: true, id: true, message: true, metadata: true } } })
useCreatePlatformFunctionDeploymentEventMutation({ selection: { fields: { id: true } } })
useUpdatePlatformFunctionDeploymentEventMutation({ selection: { fields: { id: true } } })
useDeletePlatformFunctionDeploymentEventMutation({})
```

## Examples

### List all platformFunctionDeploymentEvents

```typescript
const { data, isLoading } = usePlatformFunctionDeploymentEventsQuery({
  selection: { fields: { actorId: true, createdAt: true, deploymentId: true, eventType: true, id: true, message: true, metadata: true } },
});
```

### Create a platformFunctionDeploymentEvent

```typescript
const { mutate } = useCreatePlatformFunctionDeploymentEventMutation({
  selection: { fields: { id: true } },
});
mutate({ actorId: '<UUID>', deploymentId: '<UUID>', eventType: '<String>', message: '<String>', metadata: '<JSON>' });
```
