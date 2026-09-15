# platformRepositoryWorkflow

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Bindings from a repository event to the flow graph that should run

## Usage

```typescript
db.platformRepositoryWorkflow.findMany({ select: { id: true } }).execute()
db.platformRepositoryWorkflow.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformRepositoryWorkflow.create({ data: { cancelInProgress: '<Boolean>', concurrencyKey: '<String>', createdBy: '<UUID>', createdByPrincipal: '<UUID>', eventType: '<String>', graphId: '<UUID>', inputs: '<JSON>', isEnabled: '<Boolean>', name: '<String>', refPattern: '<String>', repositoryId: '<UUID>', requiredSecrets: '<String>', slug: '<String>', updatedBy: '<UUID>', updatedByPrincipal: '<UUID>' }, select: { id: true } }).execute()
db.platformRepositoryWorkflow.update({ where: { id: '<UUID>' }, data: { cancelInProgress: '<Boolean>' }, select: { id: true } }).execute()
db.platformRepositoryWorkflow.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformRepositoryWorkflow records

```typescript
const items = await db.platformRepositoryWorkflow.findMany({
  select: { id: true, cancelInProgress: true }
}).execute();
```

### Create a platformRepositoryWorkflow

```typescript
const item = await db.platformRepositoryWorkflow.create({
  data: { cancelInProgress: '<Boolean>', concurrencyKey: '<String>', createdBy: '<UUID>', createdByPrincipal: '<UUID>', eventType: '<String>', graphId: '<UUID>', inputs: '<JSON>', isEnabled: '<Boolean>', name: '<String>', refPattern: '<String>', repositoryId: '<UUID>', requiredSecrets: '<String>', slug: '<String>', updatedBy: '<UUID>', updatedByPrincipal: '<UUID>' },
  select: { id: true }
}).execute();
```
