# repositoryWorkflow

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Bindings from a repository event to the flow graph that should run

## Usage

```typescript
db.repositoryWorkflow.findMany({ select: { id: true } }).execute()
db.repositoryWorkflow.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.repositoryWorkflow.create({ data: { cancelInProgress: '<Boolean>', concurrencyKey: '<String>', createdBy: '<UUID>', createdByPrincipal: '<UUID>', databaseId: '<UUID>', eventType: '<String>', graphId: '<UUID>', inputs: '<JSON>', isEnabled: '<Boolean>', name: '<String>', refPattern: '<String>', repositoryId: '<UUID>', requiredSecrets: '<String>', slug: '<String>', updatedBy: '<UUID>', updatedByPrincipal: '<UUID>' }, select: { id: true } }).execute()
db.repositoryWorkflow.update({ where: { id: '<UUID>' }, data: { cancelInProgress: '<Boolean>' }, select: { id: true } }).execute()
db.repositoryWorkflow.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all repositoryWorkflow records

```typescript
const items = await db.repositoryWorkflow.findMany({
  select: { id: true, cancelInProgress: true }
}).execute();
```

### Create a repositoryWorkflow

```typescript
const item = await db.repositoryWorkflow.create({
  data: { cancelInProgress: '<Boolean>', concurrencyKey: '<String>', createdBy: '<UUID>', createdByPrincipal: '<UUID>', databaseId: '<UUID>', eventType: '<String>', graphId: '<UUID>', inputs: '<JSON>', isEnabled: '<Boolean>', name: '<String>', refPattern: '<String>', repositoryId: '<UUID>', requiredSecrets: '<String>', slug: '<String>', updatedBy: '<UUID>', updatedByPrincipal: '<UUID>' },
  select: { id: true }
}).execute();
```
