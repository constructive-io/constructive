# functionDeploymentEvent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Deployment lifecycle events — audit log of provisioning, scaling, and failure events

## Usage

```typescript
db.functionDeploymentEvent.findMany({ select: { id: true } }).execute()
db.functionDeploymentEvent.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.functionDeploymentEvent.create({ data: { deploymentId: '<UUID>', eventType: '<String>', actorId: '<UUID>', message: '<String>', metadata: '<JSON>', databaseId: '<UUID>' }, select: { id: true } }).execute()
db.functionDeploymentEvent.update({ where: { id: '<UUID>' }, data: { deploymentId: '<UUID>' }, select: { id: true } }).execute()
db.functionDeploymentEvent.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all functionDeploymentEvent records

```typescript
const items = await db.functionDeploymentEvent.findMany({
  select: { id: true, deploymentId: true }
}).execute();
```

### Create a functionDeploymentEvent

```typescript
const item = await db.functionDeploymentEvent.create({
  data: { deploymentId: '<UUID>', eventType: '<String>', actorId: '<UUID>', message: '<String>', metadata: '<JSON>', databaseId: '<UUID>' },
  select: { id: true }
}).execute();
```
