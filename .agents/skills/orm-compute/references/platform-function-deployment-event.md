# platformFunctionDeploymentEvent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Deployment lifecycle events — audit log of provisioning, scaling, and failure events

## Usage

```typescript
db.platformFunctionDeploymentEvent.findMany({ select: { id: true } }).execute()
db.platformFunctionDeploymentEvent.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformFunctionDeploymentEvent.create({ data: { deploymentId: '<UUID>', eventType: '<String>', actorId: '<UUID>', message: '<String>', metadata: '<JSON>' }, select: { id: true } }).execute()
db.platformFunctionDeploymentEvent.update({ where: { id: '<UUID>' }, data: { deploymentId: '<UUID>' }, select: { id: true } }).execute()
db.platformFunctionDeploymentEvent.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformFunctionDeploymentEvent records

```typescript
const items = await db.platformFunctionDeploymentEvent.findMany({
  select: { id: true, deploymentId: true }
}).execute();
```

### Create a platformFunctionDeploymentEvent

```typescript
const item = await db.platformFunctionDeploymentEvent.create({
  data: { deploymentId: '<UUID>', eventType: '<String>', actorId: '<UUID>', message: '<String>', metadata: '<JSON>' },
  select: { id: true }
}).execute();
```
