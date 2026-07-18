# webhookEndpoint

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Webhook route authority: (host, path) -> function task_identifier invoked through the webhook channel, with provider, signing-secret reference, and replay window

## Usage

```typescript
db.webhookEndpoint.findMany({ select: { id: true } }).execute()
db.webhookEndpoint.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.webhookEndpoint.create({ data: { active: '<Boolean>', createdBy: '<UUID>', databaseId: '<UUID>', functionDefinitionId: '<UUID>', host: '<String>', namespaceId: '<UUID>', path: '<String>', provider: '<String>', replayWindowSeconds: '<Int>', signingSecretName: '<String>', updatedBy: '<UUID>' }, select: { id: true } }).execute()
db.webhookEndpoint.update({ where: { id: '<UUID>' }, data: { active: '<Boolean>' }, select: { id: true } }).execute()
db.webhookEndpoint.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all webhookEndpoint records

```typescript
const items = await db.webhookEndpoint.findMany({
  select: { id: true, active: true }
}).execute();
```

### Create a webhookEndpoint

```typescript
const item = await db.webhookEndpoint.create({
  data: { active: '<Boolean>', createdBy: '<UUID>', databaseId: '<UUID>', functionDefinitionId: '<UUID>', host: '<String>', namespaceId: '<UUID>', path: '<String>', provider: '<String>', replayWindowSeconds: '<Int>', signingSecretName: '<String>', updatedBy: '<UUID>' },
  select: { id: true }
}).execute();
```
