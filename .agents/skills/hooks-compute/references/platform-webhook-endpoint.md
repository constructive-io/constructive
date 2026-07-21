# platformWebhookEndpoint

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Webhook route authority: (host, path) -> function task_identifier invoked through the webhook channel, with provider, signing-secret reference, and replay window

## Usage

```typescript
usePlatformWebhookEndpointsQuery({ selection: { fields: { active: true, createdAt: true, createdBy: true, functionDefinitionId: true, host: true, id: true, namespaceId: true, path: true, provider: true, replayWindowSeconds: true, signingSecretName: true, updatedAt: true, updatedBy: true } } })
usePlatformWebhookEndpointQuery({ id: '<UUID>', selection: { fields: { active: true, createdAt: true, createdBy: true, functionDefinitionId: true, host: true, id: true, namespaceId: true, path: true, provider: true, replayWindowSeconds: true, signingSecretName: true, updatedAt: true, updatedBy: true } } })
useCreatePlatformWebhookEndpointMutation({ selection: { fields: { id: true } } })
useUpdatePlatformWebhookEndpointMutation({ selection: { fields: { id: true } } })
useDeletePlatformWebhookEndpointMutation({})
```

## Examples

### List all platformWebhookEndpoints

```typescript
const { data, isLoading } = usePlatformWebhookEndpointsQuery({
  selection: { fields: { active: true, createdAt: true, createdBy: true, functionDefinitionId: true, host: true, id: true, namespaceId: true, path: true, provider: true, replayWindowSeconds: true, signingSecretName: true, updatedAt: true, updatedBy: true } },
});
```

### Create a platformWebhookEndpoint

```typescript
const { mutate } = useCreatePlatformWebhookEndpointMutation({
  selection: { fields: { id: true } },
});
mutate({ active: '<Boolean>', createdBy: '<UUID>', functionDefinitionId: '<UUID>', host: '<String>', namespaceId: '<UUID>', path: '<String>', provider: '<String>', replayWindowSeconds: '<Int>', signingSecretName: '<String>', updatedBy: '<UUID>' });
```
