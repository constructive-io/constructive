# platformRepositoryRequiredCheck

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Workflows required to pass before a repository proposal merges

## Usage

```typescript
db.platformRepositoryRequiredCheck.findMany({ select: { id: true } }).execute()
db.platformRepositoryRequiredCheck.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformRepositoryRequiredCheck.create({ data: { repositoryId: '<UUID>', workflowId: '<UUID>' }, select: { id: true } }).execute()
db.platformRepositoryRequiredCheck.update({ where: { id: '<UUID>' }, data: { repositoryId: '<UUID>' }, select: { id: true } }).execute()
db.platformRepositoryRequiredCheck.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformRepositoryRequiredCheck records

```typescript
const items = await db.platformRepositoryRequiredCheck.findMany({
  select: { id: true, repositoryId: true }
}).execute();
```

### Create a platformRepositoryRequiredCheck

```typescript
const item = await db.platformRepositoryRequiredCheck.create({
  data: { repositoryId: '<UUID>', workflowId: '<UUID>' },
  select: { id: true }
}).execute();
```
