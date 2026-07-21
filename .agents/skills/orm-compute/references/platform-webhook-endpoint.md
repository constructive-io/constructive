# platformWebhookEndpoint

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Webhook route authority: (host, path) -> function task_identifier invoked through the webhook channel, with provider, signing-secret reference, and replay window

## Usage

```typescript
db.platformWebhookEndpoint.findMany({ select: { id: true } }).execute()
db.platformWebhookEndpoint.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformWebhookEndpoint.create({ data: { active: '<Boolean>', createdBy: '<UUID>', functionDefinitionId: '<UUID>', host: '<String>', namespaceId: '<UUID>', path: '<String>', provider: '<String>', replayWindowSeconds: '<Int>', signingSecretName: '<String>', updatedBy: '<UUID>' }, select: { id: true } }).execute()
db.platformWebhookEndpoint.update({ where: { id: '<UUID>' }, data: { active: '<Boolean>' }, select: { id: true } }).execute()
db.platformWebhookEndpoint.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformWebhookEndpoint records

```typescript
const items = await db.platformWebhookEndpoint.findMany({
  select: { id: true, active: true }
}).execute();
```

### Create a platformWebhookEndpoint

```typescript
const item = await db.platformWebhookEndpoint.create({
  data: { active: '<Boolean>', createdBy: '<UUID>', functionDefinitionId: '<UUID>', host: '<String>', namespaceId: '<UUID>', path: '<String>', provider: '<String>', replayWindowSeconds: '<Int>', signingSecretName: '<String>', updatedBy: '<UUID>' },
  select: { id: true }
}).execute();
```
