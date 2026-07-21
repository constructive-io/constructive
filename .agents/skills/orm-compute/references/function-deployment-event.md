# functionDeploymentEvent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Deployment lifecycle events — audit log of provisioning, scaling, and failure events

## Usage

```typescript
db.functionDeploymentEvent.findMany({ select: { id: true } }).execute()
db.functionDeploymentEvent.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.functionDeploymentEvent.create({ data: { actorId: '<UUID>', databaseId: '<UUID>', deploymentId: '<UUID>', eventType: '<String>', message: '<String>', metadata: '<JSON>' }, select: { id: true } }).execute()
db.functionDeploymentEvent.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute()
db.functionDeploymentEvent.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all functionDeploymentEvent records

```typescript
const items = await db.functionDeploymentEvent.findMany({
  select: { id: true, actorId: true }
}).execute();
```

### Create a functionDeploymentEvent

```typescript
const item = await db.functionDeploymentEvent.create({
  data: { actorId: '<UUID>', databaseId: '<UUID>', deploymentId: '<UUID>', eventType: '<String>', message: '<String>', metadata: '<JSON>' },
  select: { id: true }
}).execute();
```
