# repositoryRequiredCheck

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Workflows required to pass before a repository proposal merges

## Usage

```typescript
db.repositoryRequiredCheck.findMany({ select: { id: true } }).execute()
db.repositoryRequiredCheck.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.repositoryRequiredCheck.create({ data: { databaseId: '<UUID>', repositoryId: '<UUID>', workflowId: '<UUID>' }, select: { id: true } }).execute()
db.repositoryRequiredCheck.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.repositoryRequiredCheck.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all repositoryRequiredCheck records

```typescript
const items = await db.repositoryRequiredCheck.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a repositoryRequiredCheck

```typescript
const item = await db.repositoryRequiredCheck.create({
  data: { databaseId: '<UUID>', repositoryId: '<UUID>', workflowId: '<UUID>' },
  select: { id: true }
}).execute();
```
