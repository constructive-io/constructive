# webhookEndpoint

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Webhook route authority: (host, path) -> function task_identifier invoked through the webhook channel, with provider, signing-secret reference, and replay window

## Usage

```typescript
useWebhookEndpointsQuery({ selection: { fields: { active: true, createdAt: true, createdBy: true, databaseId: true, functionDefinitionId: true, host: true, id: true, namespaceId: true, path: true, provider: true, replayWindowSeconds: true, signingSecretName: true, updatedAt: true, updatedBy: true } } })
useWebhookEndpointQuery({ id: '<UUID>', selection: { fields: { active: true, createdAt: true, createdBy: true, databaseId: true, functionDefinitionId: true, host: true, id: true, namespaceId: true, path: true, provider: true, replayWindowSeconds: true, signingSecretName: true, updatedAt: true, updatedBy: true } } })
useCreateWebhookEndpointMutation({ selection: { fields: { id: true } } })
useUpdateWebhookEndpointMutation({ selection: { fields: { id: true } } })
useDeleteWebhookEndpointMutation({})
```

## Examples

### List all webhookEndpoints

```typescript
const { data, isLoading } = useWebhookEndpointsQuery({
  selection: { fields: { active: true, createdAt: true, createdBy: true, databaseId: true, functionDefinitionId: true, host: true, id: true, namespaceId: true, path: true, provider: true, replayWindowSeconds: true, signingSecretName: true, updatedAt: true, updatedBy: true } },
});
```

### Create a webhookEndpoint

```typescript
const { mutate } = useCreateWebhookEndpointMutation({
  selection: { fields: { id: true } },
});
mutate({ active: '<Boolean>', createdBy: '<UUID>', databaseId: '<UUID>', functionDefinitionId: '<UUID>', host: '<String>', namespaceId: '<UUID>', path: '<String>', provider: '<String>', replayWindowSeconds: '<Int>', signingSecretName: '<String>', updatedBy: '<UUID>' });
```
